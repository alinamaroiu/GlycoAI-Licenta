import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
  radius: 20,
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const BACKEND_URL = 'https://alinam14-backend.hf.space';
  
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Eroare', 'Completează toate câmpurile.');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    console.log('Status:', response.status);
console.log('Data:', JSON.stringify(data));

    if (!response.ok || !data.success) {
      Alert.alert('Eroare', data.error || 'Email sau parolă incorecte.');
      return;
    }

    await AsyncStorage.setItem('user_id', String(data.user_id));
    await AsyncStorage.setItem('loggedIn', 'true');

  // Ștergem datele vechi și punem datele noului utilizator
  await AsyncStorage.setItem(
    'user',
    JSON.stringify({
      id: data.user_id,
      email: email,
      name: email.split('@')[0], // Punem un nume provizoriu din email
      diabetesType: 'Tip 2' // Sau orice default ai stabilit
    })
  );
    router.replace('/(tabs)');
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert('Eroare', 'Nu s-a putut realiza conexiunea cu serverul.');
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoBox}>
          <Text style={{ fontSize: 48 }}>🥗</Text>
        </View>
        <Text style={styles.title}>GlycoAI</Text>
        <Text style={styles.subtitle}>Calculator GI & GL</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.textSub}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Parolă"
            placeholderTextColor={C.textSub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Intră în cont</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkBtn}>
            <Text style={styles.link}>
              Nu ai cont? <Text style={styles.linkBold}>Înregistrează-te</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 32, fontWeight: '800', color: C.primary, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: C.textSub, textAlign: 'center', marginBottom: 32, marginTop: 4 },

  card: {
    backgroundColor: C.card,
    borderRadius: C.radius,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  input: {
    backgroundColor: '#F9FAFB',
    color: C.text,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  button: {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkBtn: { marginTop: 20, alignSelf: 'center' },
  link: { color: C.textSub, fontSize: 14 },
  linkBold: { color: C.primary, fontWeight: '700' },
});