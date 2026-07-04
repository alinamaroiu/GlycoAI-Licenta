import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---- Paleta Medicală (Sincronizată cu index.tsx) ----
const C = {
  bg: '#F0F7F4',           
  card: '#FFFFFF',          
  primary: '#0F766E',       // Teal medical principal
  primaryLight: '#CCFBF1',  // Mint deschis pentru fundaluri
  text: '#111827',          
  textSub: '#6B7280',       
  border: '#E5E7EB',        
  radius: 20,
};

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [diabetesType, setDiabetesType] = useState('Tip 2');
  const BACKEND_URL = 'https://alinam14-backend.hf.space';
  const diabetesOptions = ['Tip 1', 'Tip 2', 'Pre-diabet', 'Niciunul'];

  const handleRegister = async () => {
  if (!name || !email || !password) {
    Alert.alert('Eroare', 'Completează toate câmpurile.');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      Alert.alert('Eroare', data.error || 'Înregistrare eșuată.');
      return;
    }

    const user = {
      id: data.user_id,
      name,
      email,
      diabetesType,
    };

    await AsyncStorage.setItem('user_id', String(data.user_id));
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('loggedIn', 'true');
    await AsyncStorage.setItem('onboarding_seen', 'true');

    Alert.alert('Succes', 'Cont creat cu succes!');
    router.replace('/(tabs)');
  } catch (error) {
    console.error('Register error:', error);
    Alert.alert('Eroare', 'Nu s-a putut realiza conexiunea cu serverul.');
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header cu Logo Emoji */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={{ fontSize: 28 }}>🩺</Text>
          </View>
          <Text style={styles.title}>GlycoAI</Text>
          <Text style={styles.subtitle}>Creează-ți profilul</Text>
        </View>

        {/* Cardul de Înregistrare */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Înregistrare</Text>

          <Text style={styles.label}>NUME COMPLET</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Popescu Ion"
            placeholderTextColor={C.textSub}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="contact@email.com"
            placeholderTextColor={C.textSub}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PAROLĂ</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={C.textSub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>TIP DIABET</Text>
          <View style={styles.typeGrid}>
            {diabetesOptions.map((type) => {
              const isActive = diabetesType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                  onPress={() => setDiabetesType(type)}>
                  <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Creează cont</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}>Ai deja cont? <Text style={{fontWeight: '700', color: C.primary}}>Autentifică-te</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
  },
  subtitle: {
    fontSize: 15,
    color: C.textSub,
  },
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  typeBtnActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  typeBtnText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  button: {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: C.textSub,
    textAlign: 'center',
    fontSize: 14,
  },
});