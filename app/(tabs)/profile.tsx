import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
  dangerLight: '#FEF2F2',
  radius: 20,
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mealCount, setMealCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

const loadData = async () => {
  const stored = await AsyncStorage.getItem('user');
  if (stored) setUser(JSON.parse(stored));

  try {
    const userId = await AsyncStorage.getItem('user_id');
    if (!userId) return;
    const res = await fetch(`${BACKEND_URL}/api/meals/today?user_id=${userId}`);
    const data = await res.json();
    if (data.success) setMealCount(data.meals.length);
  } catch (e) {
    console.error(e);
  }
};

  const handleLogout = async () => {
    Alert.alert('Deconectare', 'Ești sigur că vrei să ieși?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Ieși',
        style: 'destructive',
        onPress: async () => {  
          await AsyncStorage.clear();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleClearHistory = async () => {
  Alert.alert(
    'Șterge istoricul',
    'Ești sigur? Această acțiune nu poate fi anulată.',
    [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
              Alert.alert('Eroare', 'Utilizatorul nu este autentificat.');
              return;
            }
            const res = await fetch(`${BACKEND_URL}/api/meals/clear`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            if (data.success) {
              setMealCount(0);
              Alert.alert('✅ Succes', 'Istoricul a fost șters.');
            } else {
              Alert.alert('Eroare', data.error || 'Nu s-a putut șterge istoricul.');
            }
          } catch (e) {
            Alert.alert('Eroare', 'Backend-ul nu răspunde sau endpoint-ul nu există.');
          }
        },
      },
    ]
  );
};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Profil</Text>

      {user ? (
        <>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>

          {/* Informații cont */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informații cont</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tip diabet</Text>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{user.diabetesType || 'Nespecificat'}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Mese înregistrate azi</Text>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{mealCount}</Text>
              </View>
            </View>
          </View>

          {/* Ghid GI */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghid Indice Glicemic</Text>
            <View style={styles.giRow}>
              <View style={[styles.giDot, { backgroundColor: C.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.giLabel}>GI Scăzut (0–55)</Text>
                <Text style={styles.giSub}>Recomandat zilnic</Text>
              </View>
            </View>
            <View style={styles.giRow}>
              <View style={[styles.giDot, { backgroundColor: C.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.giLabel}>GI Mediu (56–70)</Text>
                <Text style={styles.giSub}>Cu moderație</Text>
              </View>
            </View>
            <View style={[styles.giRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.giDot, { backgroundColor: C.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.giLabel}>GI Ridicat (71+)</Text>
                <Text style={styles.giSub}>Evită sau limitează</Text>
              </View>
            </View>
          </View>

          {/* Acțiuni */}
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearHistory}>
            <Text style={styles.dangerBtnText}>🗑️  Șterge istoricul meselor</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Deconectare</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyText}>Nu ești autentificat.</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.logoutBtnText}>Mergi la Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24, letterSpacing: -0.5 },

  avatarContainer: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: C.primaryLight,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: C.primary },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  email: { fontSize: 14, color: C.textSub, marginTop: 4 },

  card: {
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoLabel: { fontSize: 15, color: C.text },
  infoBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  infoBadgeText: { fontSize: 14, fontWeight: '700', color: C.primary },

  giRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  giDot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
  giLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  giSub: { fontSize: 12, color: C.textSub, marginTop: 2 },

  dangerBtn: {
    backgroundColor: C.dangerLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerBtnText: { color: C.danger, fontSize: 15, fontWeight: '700' },

  logoutBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: C.textSub, fontSize: 16, marginBottom: 24 },
});