import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

// Helper: transformă "uec_pizza" sau "apple_pie" în "Uec Pizza", "Apple Pie"
function formatFoodName(raw: string): string {
  if (!raw) return 'Necunoscut';
  // Dacă conține diacritice românești sau e deja ok, doar capitalizăm
  const cleaned = raw.replace(/_/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function HistoryScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMeals = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) return;
      const res = await fetch(`${BACKEND_URL}/api/meals/today?user_id=${userId}`);
      const data = await res.json();
      if (data.success) setMeals(data.meals.reverse());
    } catch (e) {
      console.error(e);
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

  const getGIColor = (gi: number) => {
    if (gi <= 55) return C.success;
    if (gi <= 70) return C.warning;
    return C.danger;
  };

  const getGLColor = (gl: number) => {
    if (gl < 10) return C.success;
    if (gl <= 20) return C.warning;
    return C.danger;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <Text style={styles.header}>Istoric mese</Text>

      {meals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyText}>Nu ai înregistrat nicio masă încă.</Text>
          <Text style={styles.emptySubtext}>Fă o poză unui aliment din Home!</Text>
        </View>
      ) : (
        meals.map((meal, index) => {
          const displayName = meal.food_name ? formatFoodName(meal.food_name) : formatFoodName(meal.food_class);
          const gi = meal.gi ?? 0;
          const gl = meal.gl ?? 0;
          const time = meal.timestamp ? new Date(meal.timestamp).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '';

          return (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.foodName}>{displayName}</Text>
                  <View style={[styles.giBadge, { backgroundColor: getGIColor(gi) + '18' }]}>
                    <Text style={[styles.giBadgeText, { color: getGIColor(gi) }]}>GI {gi}</Text>
                  </View>
                </View>
                <Text style={styles.time}>{time}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Glicemic Load</Text>
                  <Text style={[styles.statValue, { color: getGLColor(gl) }]}>{gl.toFixed(1)}</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Carbohidrați</Text>
                  <Text style={styles.statValue}>{(meal.carbs_total ?? 0).toFixed(1)}g</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Porție</Text>
                  <Text style={styles.statValue}>{meal.grams}g</Text>
                </View>
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
  header: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24, letterSpacing: -0.5 },

  empty: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: C.text, fontWeight: '600', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: C.textSub },

  card: {
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foodName: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1, flexWrap: 'wrap', paddingRight: 12 },
  time: { fontSize: 12, color: C.textSub, marginTop: 4 },
  giBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  giBadgeText: { fontSize: 12, fontWeight: '800' },

  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: C.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800', color: C.text },
  statSep: { width: 1, height: 24, backgroundColor: C.border },
});