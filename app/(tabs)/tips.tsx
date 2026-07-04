import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

const TIPS = [
  {
    category: 'Alimentație',
    icon: '🍽️',
    color: '#059669',
    items: [
      'Alege alimente cu GI scăzut (sub 55) pentru a menține glicemia stabilă.',
      'Combină carbohidrații cu proteine sau grăsimi sănătoase pentru a reduce GI-ul mesei.',
      'Evită băuturile îndulcite – au GI foarte ridicat și cresc rapid glicemia.',
      'Consumă legume cu frunze verzi la fiecare masă – au GI aproape zero.',
      'Orezul brun are GI mai mic decât orezul alb. Preferă variantele integrale.',
      'Mâncatul lent și mestecatul bine reduc viteza de absorbție a glucozei.',
    ],
  },
  {
    category: 'Activitate fizică',
    icon: '🏃',
    color: '#0284C7',
    items: [
      'O plimbare de 15-20 minute după masă reduce semnificativ glicemia postprandială.',
      'Exercițiile regulate cresc sensibilitatea la insulină.',
      'Evită sedentarismul prelungit – ridică-te și mișcă-te cel puțin o dată la oră.',
      'Exercițiile de forță (greutăți) ajută mușchii să consume glucoza mai eficient.',
    ],
  },
  {
    category: 'Monitorizare',
    icon: '💊',
    color: '#7C3AED',
    items: [
      'Măsoară glicemia înainte și la 2 ore după masă pentru a înțelege impactul alimentelor.',
      'Ține un jurnal alimentar – această aplicație te ajută exact cu asta!',
      'Glicemia țintă după masă (la 2h): sub 140 mg/dL pentru majoritatea diabeticilor.',
      'Consultă medicul dacă glicemia depășește frecvent 180 mg/dL după masă.',
    ],
  },
  {
    category: 'Stil de viață',
    icon: '😴',
    color: '#D97706',
    items: [
      'Somnul insuficient crește rezistența la insulină. Dormi 7-8 ore pe noapte.',
      'Stresul cronic ridică glicemia prin eliberarea de cortizol. Încearcă meditația sau yoga.',
      'Hidratarea corectă (2L apă/zi) ajută rinichii să elimine excesul de glucoză.',
      'Alcoolul poate provoca hipoglicemie – consumă-l cu moderație și întotdeauna cu mâncare.',
    ],
  },
  {
    category: 'Alimente recomandate',
    icon: '🥗',
    color: '#0F766E',
    items: [
      'Leguminoase: linte (GI 32), năut (GI 28), fasole (GI 24).',
      'Fructe: mere (GI 36), pere (GI 38), căpșuni (GI 40).',
      'Cereale integrale: ovăz (GI 55), orz (GI 28), quinoa (GI 53).',
      'Lactate: iaurt natural (GI 36), lapte (GI 31).',
      'Legume: broccoli, spanac, roșii, castraveți – GI sub 20.',
    ],
  },
];

export default function TipsScreen() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Sfaturi</Text>
      <Text style={styles.subheader}>
        Informații utile pentru gestionarea glicemiei prin alimentație și stil de viață.
      </Text>

      {TIPS.map((section, index) => {
        const isOpen = expanded === index;
        return (
          <View key={index} style={[styles.card, isOpen && { borderColor: section.color + '40' }]}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpanded(isOpen ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <View style={[styles.iconBox, { backgroundColor: section.color + '15' }]}>
                  <Text style={{ fontSize: 20 }}>{section.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{section.category}</Text>
              </View>
              <View style={[styles.chevron, isOpen && { backgroundColor: section.color + '15' }]}>
                <Text style={[styles.chevronText, { color: section.color }]}>
                  {isOpen ? '▲' : '▼'}
                </Text>
              </View>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.cardBody}>
                <View style={[styles.divider, { backgroundColor: section.color + '30' }]} />
                {section.items.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={[styles.bullet, { backgroundColor: section.color }]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>
          Aceste informații au caracter educativ și nu înlocuiesc sfatul medicului.
          Consultați întotdeauna medicul diabetolog pentru recomandări personalizate.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subheader: { fontSize: 14, color: C.textSub, marginBottom: 24, marginTop: 4, lineHeight: 20 },

  card: {
    backgroundColor: C.card,
    borderRadius: C.radius,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, marginBottom: 14 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
    marginTop: 7,
  },
  tipText: { color: C.text, fontSize: 14, lineHeight: 21, flex: 1 },

  disclaimer: {
    backgroundColor: '#FFFBEB',
    borderRadius: C.radius,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  disclaimerText: { color: '#92400E', fontSize: 13, lineHeight: 19, flex: 1 },
});