import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

const BACKEND_URL = 'https://alinam14-backend.hf.space';

const C = {
  bg: '#F0F7F4',
  card: '#FFFFFF',
  primary: '#0F766E',
  text: '#111827',
  textSub: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  radius: 20,
};

function formatFoodName(raw: string): string {
  if (!raw) return 'Necunoscut';
  const cleaned = raw.replace(/_/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function StatsScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMeals = async () => {
    try {
      // 1. Preluăm ID-ul utilizatorului logat
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        console.log("Stats: Nu am găsit user_id în stocare.");
        return;
      }

      // 2. Trimitem ID-ul corect către backend
      const res = await fetch(`${BACKEND_URL}/api/meals/today?user_id=${userId}`);
      const data = await res.json();
      
      if (data.success) {
        setMeals(data.meals);
      }
    } catch (e) {
      console.error("Eroare încărcare statistici:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMeals().finally(() => setRefreshing(false));
  }, []);

  const today = new Date().toLocaleDateString('ro-RO');

  // Calcule - Verificăm多个 posibile chei din JSON (carbs_total, carbs, carbohidrati)
  const avgGI = meals.length > 0
      ? (meals.reduce((s, m) => s + (m.gi || 0), 0) / meals.length).toFixed(0)
      : '0';
  
  const totalGL = meals.reduce((s, m) => s + (m.gl || 0), 0).toFixed(1);
  
  // Aici forțăm verificarea mai multor chei pentru a nu avea 0.0
  const totalCarbs = meals.reduce((s, m) => {
    return s + (m.carbs_total || m.carbs || 0);
  }, 0).toFixed(1);

  const totalCalories = meals.reduce((s, m) => {
    return s + (m.calories || m.kcal || 0);
  }, 0).toFixed(0);

  const getGILabel = (gi: number) => {
    if (gi <= 55) return { label: 'Scăzut', color: C.success };
    if (gi <= 70) return { label: 'Mediu', color: C.warning };
    return { label: 'Ridicat', color: C.danger };
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <Text style={styles.header}>Statistici</Text>
      <Text style={styles.subheader}>Rezumatul zilei de azi • {today}</Text>

      {/* Grid de Carduri Statice */}
      <View style={styles.statsGrid}>
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mese</Text>
            <Text style={styles.statValue}>{meals.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>GI Mediu</Text>
            <Text style={[styles.statValue, { color: C.primary }]}>{avgGI}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>GL Total</Text>
            <Text style={[styles.statValue, { color: parseFloat(totalGL) > 20 ? C.danger : C.text }]}>
              {totalGL}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Calorii</Text>
            <Text style={styles.statValue}>{totalCalories} <Text style={styles.unit}>kcal</Text></Text>
          </View>
        </View>

        <View style={[styles.statCard, { width: '100%', marginTop: 12, paddingVertical: 15 }]}>
          <Text style={styles.statLabel}>Carbohidrați Totali</Text>
          <Text style={[styles.statValue, { fontSize: 32 }]}>
            {totalCarbs} <Text style={styles.unit}>g</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Distribuție Mese</Text>
      {meals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nu sunt date pentru ziua de azi.</Text>
        </View>
      ) : (
        meals.map((meal, i) => {
          const giInfo = getGILabel(meal.gi);
          return (
            <View key={i} style={styles.mealRow}>
              <View>
                <Text style={styles.mealName}>{meal.food_name ? formatFoodName(meal.food_name) : formatFoodName(meal.food_class)}</Text>
                <Text style={styles.mealSub}>{meal.grams}g • {meal.gl?.toFixed(1)} GL</Text>
              </View>
              <View style={[styles.giTag, { backgroundColor: giInfo.color + '15' }]}>
                <Text style={[styles.giTagText, { color: giInfo.color }]}>{giInfo.label}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subheader: { color: C.textSub, fontSize: 14, marginBottom: 24, marginTop: 4 },
  
  statsGrid: { marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statLabel: { color: C.textSub, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: C.text },
  unit: { fontSize: 14, fontWeight: '600', color: C.textSub },

  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  emptyCard: { padding: 30, alignItems: 'center' },
  emptyText: { color: C.textSub, fontSize: 15 },
  
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  mealName: { color: C.text, fontSize: 15, fontWeight: '700' },
  mealSub: { color: C.textSub, fontSize: 13, marginTop: 2 },
  giTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  giTagText: { fontSize: 11, fontWeight: '800' },
});