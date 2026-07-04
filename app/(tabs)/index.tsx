import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BACKEND_URL = 'https://alinam14-backend.hf.space';

const C = {
  bg: '#F0F7F4',
  card: '#FFFFFF',
  primary: '#0F766E',
  primaryLight: '#14B8A6',
  text: '#111827',
  textSub: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  radius: 20,
};

class FoodItem {
  name: string;
  gi: number;
  carbsPer100g: number;

  constructor(data: any) {
    this.name = data.name;
    this.gi = data.gi;
    this.carbsPer100g = Number(data.carbs_per_100g);
  }
}

const GiRepository = {
  items: [] as FoodItem[],
  async load() {
    if (this.items.length > 0) return;
    const raw = require('../../assets/images/foods.json') as Record<string, any>;
    const data = Object.values(raw) as any[];
    this.items = data.map((e) => new FoodItem(e));
  },
  find(query: string): FoodItem | null {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    let item = this.items.find((i) => i.name.toLowerCase() === q);
    if (item) return item;
    item = this.items.find((i) => i.name.toLowerCase().includes(q));
    return item || null;
  },
};

async function recognizeLabelWithVision(imageUri: string): Promise<any | null> {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const res = await fetch(`${BACKEND_URL}/api/predict`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = await res.json();
    console.log('Raspuns backend:', JSON.stringify(data));

    if (!data.success || !data.predictions || data.predictions.length === 0) return null;
    return data.predictions;
  } catch (e) {
    console.error('Eroare recunoastere:', e);
    return null;
  }
}

async function saveMealToBackend(userId: string, foodClass: string, grams: number) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, food_class: foodClass, grams }),
    });
    const data = await res.json();
    if (data.success) console.log('Masa salvata:', data.meal);
  } catch (e) {
    console.error('Eroare salvare masa:', e);
  }
}

// ============ ONBOARDING ============

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [page, setPage] = useState(0);
  const pages = [
    {
      title: 'Bun venit la GlycoAI',
      description: 'Descoperă impactul alimentelor asupra glicemiei tale și mănâncă mai sănătos.',
    },
    {
      title: 'Analizează-ți mesele rapid',
      description: 'Fă o poză sau introdu ingredientele manual pentru a calcula instant IG și GL.',
    },
    {
      title: 'Monitorizare inteligentă',
      description: 'Urmărește istoricul și statisticile zilnice pentru un control optim asupra sănătății tale metabolice.',
      buttonText: 'Începe acum',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={obStyles.container}>
        <View style={obStyles.card}>
          <Text style={obStyles.icon}>🥗</Text>
          <Text style={obStyles.title}>{pages[page].title}</Text>
          <Text style={obStyles.desc}>{pages[page].description}</Text>
          {pages[page].buttonText ? (
            <TouchableOpacity style={obStyles.mainBtn} onPress={onComplete}>
              <Text style={obStyles.mainBtnText}>{pages[page].buttonText}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={obStyles.secBtn}
              onPress={() => setPage((p) => Math.min(p + 1, pages.length - 1))}
            >
              <Text style={obStyles.secBtnText}>Continuă</Text>
            </TouchableOpacity>
          )}
          <View style={obStyles.dotsRow}>
            {pages.map((_, i) => (
              <View key={i} style={[obStyles.dot, page === i && obStyles.dotActive]} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============ HOME ============

function HomeScreen() {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalColor, setModalColor] = useState(C.success);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [gramsModalVisible, setGramsModalVisible] = useState(false);
  const [gramsValue, setGramsValue] = useState('');
  const [gramsResolve, setGramsResolve] = useState<((value: number | null) => void) | null>(null);
  const [gramsModalTitle, setGramsModalTitle] = useState('');

  useEffect(() => {
    GiRepository.load().then(() => setLoaded(true));
  }, []);

  const showColoredResult = (msg: string, color: string, title: string) => {
    setModalMsg(msg);
    setModalColor(color);
    setModalTitle(title);
    setModalVisible(true);
  };

  const askForGrams = (foodName: string) => {
    return new Promise<number | null>((resolve) => {
      setGramsValue('');
      setGramsModalTitle(foodName);
      setGramsResolve(() => resolve);
      setGramsModalVisible(true);
    });
  };

  const handleConfirmGrams = () => {
    const g = parseFloat(gramsValue.trim());
    if (gramsResolve) gramsResolve(isNaN(g) ? null : g);
    setGramsModalVisible(false);
  };

  const calculateFromText = () => {
    if (!loaded) {
      showColoredResult('Baza de date se încarcă...', '#0284C7', 'Un moment...');
      return;
    }
    const entries = text.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    let totalGL = 0, matched = 0, totalGI = 0, totalCarbs = 0;
    const notFound: string[] = [];

    entries.forEach((e) => {
      const parts = e.split(':');
      const name = parts[0]?.trim();
      const grams = parts.length > 1 ? parseFloat(parts[1].trim()) || 0 : 0;
      if (!name || !grams || grams <= 0) { notFound.push(e); return; }
      const item = GiRepository.find(name);
      if (!item) { notFound.push(name); return; }
      const carbsConsumed = item.carbsPer100g * (grams / 100);
      totalGL += (item.gi * carbsConsumed) / 100;
      totalGI += item.gi;
      totalCarbs += carbsConsumed;
      matched++;
    });

    if (matched === 0) {
      showColoredResult('Format corect:\nnume:gramaj, nume:gramaj\n\nEx: orez:150, cartofi:200', C.warning, 'Format incorect');
      return;
    }

    const avgGI = Math.round(totalGI / matched);
    let interpretation, advice, color, title;
    if (totalGL < 10) {
      interpretation = 'Scăzută — Excelent!'; color = C.success; title = 'Rezultat Excelent';
      advice = 'Impact minim asupra glicemiei.';
    } else if (totalGL <= 20) {
      interpretation = 'Moderată'; color = C.warning; title = 'Atenție Moderată';
      advice = 'Consumă porții mai mici și combină cu legume verzi.';
    } else {
      interpretation = 'Ridicată — Atenție!'; color = C.danger; title = 'Risc Ridicat';
      advice = 'Redu porțiile cu 30-50% și fă mișcare după masă.';
    }

    let msg = `📊 GL Total: ${totalGL.toFixed(1)} — ${interpretation}\n📈 GI Mediu: ${avgGI}\n🍞 Carbo: ${totalCarbs.toFixed(1)}g\n\n💡 ${advice}`;
    if (notFound.length > 0) msg += `\n\n❌ Negăsite: ${notFound.join(', ')}`;
    showColoredResult(msg, color, title);
  };

  const captureAndRecognize = useCallback(async () => {
    if (!loaded) return;
    try {
      setBusy(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setBusy(false);
        Alert.alert('Permisiune necesară', 'Ai nevoie de acces la cameră.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled) { setBusy(false); return; }

      const imageUri = result.assets?.[0]?.uri;
      if (!imageUri) { setBusy(false); return; }

      const predictions = await recognizeLabelWithVision(imageUri);
      if (!predictions || predictions.length === 0) {
        setBusy(false);
        showColoredResult('Nu am putut recunoaște alimentul.\nVerifică că backend-ul rulează.', C.warning, 'Eroare');
        return;
      }

      let totalGL = 0, totalCalories = 0, totalCarbs = 0, resultLines = '';

      for (const prediction of predictions) {
        const nutrition = prediction.nutrition;
        if (!nutrition) continue;

        const foodName = (nutrition.name_ro || nutrition.name || prediction.food_class).toUpperCase();
        const confidence = Math.round(prediction.confidence * 100);

        setBusy(false);
        const grams = await askForGrams(foodName);
        setBusy(true);
        if (!grams || grams <= 0) continue;

        const carbsConsumed = nutrition.carbs_per_100g * (grams / 100);
        const gl = (nutrition.gi * carbsConsumed) / 100;
        const calories = nutrition.calories_per_100g * (grams / 100);

        totalGL += gl;
        totalCalories += calories;
        totalCarbs += carbsConsumed;

        const userId = await AsyncStorage.getItem('user_id');

        if (!userId) {
          Alert.alert('Eroare', 'Utilizatorul nu este autentificat.');
          return;
        }

        await saveMealToBackend(userId, prediction.food_class, grams);

        resultLines += `🍽️ ${foodName} (${confidence}% sigur)\n`;
        resultLines += `   GI: ${nutrition.gi} | GL: ${gl.toFixed(1)} | ${calories.toFixed(0)} kcal\n\n`;
      }

      if (!resultLines) { setBusy(false); return; }

      let color, title, advice;
      if (totalGL < 10) {
        color = C.success; title = 'Masă Excelentă ✅';
        advice = 'Impact minim asupra glicemiei. Continuă așa!';
      } else if (totalGL <= 20) {
        color = C.warning; title = 'Masă Moderată ⚠️';
        advice = 'Atenție la porție. Combină cu fibre și proteine.';
      } else {
        color = C.danger; title = 'Atenție la Porție 🔴';
        advice = 'Impact mare asupra glicemiei. Redu porția!';
      }

      const msg =
        `${resultLines}` +
        `━━━━━━━━━━━━━━━━━\n` +
        `📊 GL TOTAL: ${totalGL.toFixed(1)}\n` +
        `🔥 CALORII TOTALE: ${totalCalories.toFixed(0)} kcal\n` +
        `🍞 CARBOHIDRAȚI TOTALI: ${totalCarbs.toFixed(1)}g\n\n` +
        `💡 SFAT: ${advice}`;

      setBusy(false);
      showColoredResult(msg, color, title);

    } catch (e) {
      console.error(e);
      setBusy(false);
      showColoredResult('A apărut o eroare neașteptată.', C.danger, 'Eroare');
    }
  }, [loaded]);

  const pickFromGallery = useCallback(async () => {
    if (!loaded) return;
    try {
      setBusy(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setBusy(false);
        Alert.alert('Permisiune necesară', 'Ai nevoie de acces la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled) { setBusy(false); return; }

      const imageUri = result.assets?.[0]?.uri;
      if (!imageUri) { setBusy(false); return; }

      const predictions = await recognizeLabelWithVision(imageUri);
      if (!predictions || predictions.length === 0) {
        setBusy(false);
        showColoredResult('Nu am putut recunoaște alimentul.\nVerifică că backend-ul rulează.', C.warning, 'Eroare');
        return;
      }

      let totalGL = 0, totalCalories = 0, totalCarbs = 0, resultLines = '';

      for (const prediction of predictions) {
        const nutrition = prediction.nutrition;
        if (!nutrition) continue;

        const foodName = (nutrition.name_ro || nutrition.name || prediction.food_class).toUpperCase();
        const confidence = Math.round(prediction.confidence * 100);

        setBusy(false);
        const grams = await askForGrams(foodName);
        setBusy(true);
        if (!grams || grams <= 0) continue;

        const carbsConsumed = nutrition.carbs_per_100g * (grams / 100);
        const gl = (nutrition.gi * carbsConsumed) / 100;
        const calories = (nutrition.calories_per_100g ?? 0) * (grams / 100);

        totalGL += gl;
        totalCalories += calories;
        totalCarbs += carbsConsumed;

        const userId = await AsyncStorage.getItem('user_id');

        if (!userId) {
          Alert.alert('Eroare', 'Utilizatorul nu este autentificat.');
          return;
        }

        await saveMealToBackend(userId, prediction.food_class, grams);


        resultLines += `🍽️ ${foodName} (${confidence}% sigur)\n`;
        resultLines += `   GI: ${nutrition.gi} | GL: ${gl.toFixed(1)} | ${calories.toFixed(0)} kcal\n\n`;
      }

      if (!resultLines) { setBusy(false); return; }

      let color, title, advice;
      if (totalGL < 10) {
        color = C.success; title = 'Masă Excelentă ✅';
        advice = 'Impact minim asupra glicemiei. Continuă așa!';
      } else if (totalGL <= 20) {
        color = C.warning; title = 'Masă Moderată ⚠️';
        advice = 'Atenție la porție. Combină cu fibre și proteine.';
      } else {
        color = C.danger; title = 'Atenție la Porție 🔴';
        advice = 'Impact mare asupra glicemiei. Redu porția!';
      }

      const msg =
        `${resultLines}` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📊 GL TOTAL: ${totalGL.toFixed(1)}\n` +
        `🔥 CALORII TOTALE: ${totalCalories.toFixed(0)} kcal\n` +
        `🍞 CARBOHIDRAȚI TOTALI: ${totalCarbs.toFixed(1)}g\n\n` +
        `💡 SFAT: ${advice}`;

      setBusy(false);
      showColoredResult(msg, color, title);

    } catch (e) {
      console.error(e);
      setBusy(false);
      showColoredResult('A apărut o eroare neașteptată.', C.danger, 'Eroare');
    }
  }, [loaded]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.screenContainer}>

        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Text style={{ fontSize: 28 }}>🥗</Text>
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.headerTitle}>Glyco AI</Text>
            <Text style={styles.headerSubtitle}>Calculator IG/GL</Text>
          </View>
        </View>

        <View style={[styles.card, { borderColor: '#99F6E4' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <Text style={styles.cardTitle}>Recunoaștere automată</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Fă o poză sau alege din galerie. Modelul EfficientNet-B0 identifică alimentul instant.
          </Text>

          <TouchableOpacity
            style={[styles.mainButton, { marginBottom: 10 }]}
            onPress={busy ? undefined : captureAndRecognize}
            activeOpacity={0.8}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>📸  Deschide camera</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton]}
            onPress={busy ? undefined : pickFromGallery}
            activeOpacity={0.8}
          >
            {busy ? <ActivityIndicator color={C.primary} /> : <Text style={styles.secondaryButtonText}>🖼️  Alege din galerie</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>sau</Text>
          <View style={styles.separatorLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Introdu ingredientele</Text>
          <Text style={styles.cardSubtitle}>
            Format: nume:gramaj (separate prin virgulă)
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="ex: orez alb fiert:150, cartofi fierți:200"
            placeholderTextColor={C.textSub}
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity style={styles.mainButton} onPress={calculateFromText} activeOpacity={0.8}>
            <Text style={styles.mainButtonText}>⚡ Calculează IG / GL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Ghid rapid</Text>
          <View style={styles.infoRow}>
            <View style={[styles.dotIndicator, { backgroundColor: C.success }]} />
            <Text style={styles.infoText}>GL &lt; 10: Excelent</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.dotIndicator, { backgroundColor: C.warning }]} />
            <Text style={styles.infoText}>GL 10–20: Moderat</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.dotIndicator, { backgroundColor: C.danger }]} />
            <Text style={styles.infoText}>GL &gt; 20: Atenție</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { borderTopColor: modalColor }]}>
            <Text style={[styles.modalTitle, { color: modalColor }]}>{modalTitle}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.modalText}>{modalMsg}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: modalColor, marginTop: 20 }]}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.mainButtonText}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={gramsModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalLabel}>Introdu gramajul pentru</Text>
            <Text style={styles.modalFoodName}>{gramsModalTitle}</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="ex: 150"
              placeholderTextColor={C.textSub}
              value={gramsValue}
              onChangeText={setGramsValue}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginRight: 10 }]}
                onPress={() => { if (gramsResolve) gramsResolve(null); setGramsModalVisible(false); }}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mainButton} onPress={handleConfirmGrams} activeOpacity={0.8}>
                <Text style={styles.mainButtonText}>Confirmă</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============ ROOT WRAPPER ============

export default function RootScreen() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('onboarding_seen');
      // Daca e null -> nu l-a vazut -> ramane true
      // Daca e 'true' -> il ascundem
      setShowOnboarding(seen !== 'true');
      setChecking(false);
    })();
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator color={C.primary} />
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return <HomeScreen />;
}

// ============ STYLES ============

const styles = StyleSheet.create({
  screenContainer: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  headerIconBox: { backgroundColor: '#CCFBF1', width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: C.textSub, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  aiBadge: { backgroundColor: '#CCFBF1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  aiBadgeText: { color: C.primary, fontSize: 11, fontWeight: '800' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: C.textSub, marginBottom: 18, lineHeight: 20 },
  textArea: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, textAlignVertical: 'top', marginBottom: 14, backgroundColor: '#F9FAFB', color: C.text, fontSize: 15 },
  mainButton: { backgroundColor: C.primary, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', backgroundColor: 'transparent' },
  secondaryButtonText: { color: C.primary, fontSize: 16, fontWeight: '700' },
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, marginBottom: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: C.border },
  separatorText: { marginHorizontal: 10, color: C.textSub, fontWeight: '600', fontSize: 13, textTransform: 'uppercase' },
  infoBox: { backgroundColor: '#F0FDFA', borderRadius: C.radius, padding: 18, borderWidth: 1, borderColor: '#99F6E4' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: C.primary, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dotIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  infoText: { fontSize: 14, color: C.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: C.card, borderRadius: C.radius, padding: 24, width: '100%', borderTopWidth: 4, borderTopColor: C.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  modalText: { fontSize: 15, lineHeight: 22, color: C.text },
  modalLabel: { fontSize: 15, color: C.textSub, textAlign: 'center' },
  modalFoodName: { fontSize: 22, fontWeight: '800', color: C.primary, textAlign: 'center', marginVertical: 6 },
  textInput: { borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, backgroundColor: '#F9FAFB', color: C.text, fontSize: 16, marginTop: 16 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
});

const obStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: C.radius, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, textAlign: 'center', color: C.textSub, marginBottom: 32, lineHeight: 22 },
  mainBtn: { backgroundColor: C.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, borderWidth: 1.5, borderColor: C.primary, width: '100%', alignItems: 'center' },
  secBtnText: { color: C.primary, fontSize: 16, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: C.primary, borderRadius: 4 },
});