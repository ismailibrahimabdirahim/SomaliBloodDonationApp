import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, Mail, Lock, ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

type Props = { 
  onSignUp: () => void;
  onBack?: () => void;
};

export default function LoginScreen({ onSignUp, onBack }: Props) {
  const { colors, isDark } = useTheme();
  const { login } = useAuth();
  const navigation = useNavigation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(navigation.canGoBack());
  }, [navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error' | 'local' | 'network_error'>('checking');

  useEffect(() => {
    // Health check removed for performance. Only use if debugging.
    /*
    (async () => {
      try {
        const res = await api.get('/api/auth/health');
        const data = res.data as { status?: string; isLocal?: boolean };
        if (data.status === 'ok') setDbStatus(data.isLocal ? 'local' : 'connected');
        else setDbStatus('error');
      } catch {
        setDbStatus('network_error');
      }
    })();
    */
    (async () => {
      const saved = await AsyncStorage.getItem('rememberedEmail');
      if (saved) setEmail(saved);
    })();
  }, []);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError("Please enter a valid email address (e.g. you@gmail.com)");
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address (e.g. you@gmail.com)");
      return;
    }

    // Dismiss keyboard immediately for faster feel
    const { Keyboard } = require('react-native');
    Keyboard.dismiss();

    setLoading(true);
    setError('');
    try {
      const result = await api.post('/api/auth/login', { email, password });
      if (result.data.token && result.data.user) {
        // Switch screens IMMEDIATELY
        login(result.data.user, result.data.token);
      } else {
        setError("Invalid response from server.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {onBack && (
          <TouchableOpacity 
            onPress={() => {
              if (navigation.canGoBack()) {
                onBack();
              } else {
                navigation.navigate('Welcome' as never);
              }
            }} 
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.inner}>
          <View style={[styles.logoBox, { backgroundColor: isDark ? '#450a0a' : palette.red50 }]}>
            <LogIn size={40} color={palette.bloodRed} />
          </View>
          <Text style={[styles.h1, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.h2, { color: colors.textMuted }]}>Sign in to continue your journey.</Text>

          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <Mail size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <Lock size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {dbStatus === 'error' ? (
            <View style={[styles.bannerRed, { backgroundColor: isDark ? '#450a0a' : palette.red50, borderColor: palette.red100 }]}>
              <Text style={[styles.bannerRedText, { color: palette.bloodRed }]}>
                ERROR: Database not connected. Check your MONGODB_URI.
              </Text>
            </View>
          ) : dbStatus === 'network_error' ? (
            <View style={[styles.bannerRed, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: '#c7d2fe' }]}>
              <Text style={[styles.bannerRedText, { color: '#4338ca' }]}>
                NETWORK ERROR: Cannot reach server. Check API_URL.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: palette.bloodRed, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleSubmit} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={palette.white} /> : <Text style={[styles.primaryBtnText, { color: palette.white }]}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSignUp} style={styles.linkWrap}>
            <Text style={[styles.linkMuted, { color: colors.textMuted }]}>Don't have an account? </Text>
            <Text style={[styles.linkBold, { color: palette.bloodRed }]}>Sign Up</Text>
          </TouchableOpacity>

          <Text style={[styles.legal, { color: colors.textMuted }]}>
            By continuing, you agree to our <Text style={[styles.legalBold, { color: palette.bloodRed }]}>Terms</Text> and{' '}
            <Text style={[styles.legalBold, { color: palette.bloodRed }]}>Privacy</Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: { flex: 1, alignItems: 'center' },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  h1: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  h2: { fontWeight: '600', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  fieldWrap: { width: '100%', marginBottom: 14, position: 'relative', justifyContent: 'center' },
  iconLeft: { position: 'absolute', left: 14, zIndex: 1, top: 18 },
  input: { height: 54, borderRadius: 16, paddingLeft: 44, paddingRight: 14, borderWidth: 1, fontWeight: '600' },
  bannerRed: { width: '100%', padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  bannerRedText: { fontSize: 10, fontWeight: '800' },
  error: { color: palette.bloodRed, fontSize: 12, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  fieldError: { color: palette.bloodRed, fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  primaryBtn: { width: '100%', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { fontWeight: '800', fontSize: 17 },
  linkWrap: { flexDirection: 'row', marginTop: 22 },
  linkMuted: { fontWeight: '800', fontSize: 14 },
  linkBold: { fontWeight: '900', fontSize: 14 },
  orRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 18 },
  orLine: { flex: 1, height: 1 },
  or: { marginHorizontal: 12, fontSize: 11, fontWeight: '800' },
  googleBtn: { width: '100%', height: 54, marginTop: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  googleIcon: { width: 20, height: 20 },
  googleText: { fontWeight: '800', fontSize: 14 },
  legal: { marginTop: 26, fontSize: 10, textAlign: 'center', fontWeight: '600' },
  legalBold: { fontWeight: '900' },
});
