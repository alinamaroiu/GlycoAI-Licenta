import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const C = {
  bg: '#F0F7F4',
  card: '#FFFFFF',
  primary: '#0F766E',
  text: '#111827',
  textSub: '#6B7280',
  border: '#E5E7EB',
  radius: 20,
};

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
    description: 'Urmărește istoricul și statisticile zilnice pentru un control optim al diabetului.',
    buttonText: 'Începe acum',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🥗</Text>
          <Text style={styles.title}>{pages[page].title}</Text>
          <Text style={styles.desc}>{pages[page].description}</Text>

          {pages[page].buttonText ? (
            <TouchableOpacity style={styles.mainBtn} onPress={completeOnboarding}>
              <Text style={styles.mainBtnText}>{pages[page].buttonText}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secBtn} onPress={() => setPage((p) => p + 1)}>
              <Text style={styles.secBtnText}>Continuă</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dotsRow}>
            {pages.map((_, i) => (
              <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, textAlign: 'center', color: C.textSub, marginBottom: 32, lineHeight: 22 },
  mainBtn: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    width: '100%',
    alignItems: 'center',
  },
  secBtnText: { color: C.primary, fontSize: 16, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: C.primary, borderRadius: 4 },
});