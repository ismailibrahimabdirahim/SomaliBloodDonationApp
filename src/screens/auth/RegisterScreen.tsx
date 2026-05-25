import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Switch,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { User, Phone, MapPin, ChevronDown, Droplets, X, Mail, Lock, ChevronLeft } from 'lucide-react-native';
import { api } from '../../services/api';
import { REGIONS, BLOOD_TYPES } from '../../config';
import { useTheme, palette } from '../../theme/colors';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';

type Props = { 
  onSignIn: () => void;
  onBack?: () => void;
};

export default function RegisterScreen({ onSignIn, onBack }: Props) {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('O+');
  const [region, setRegion] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || !region) {
      showAlert({ type: 'error', title: 'Missing fields', message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    try {
      const result = await api.post('/api/auth/register', {
        name,
        email,
        password,
        phone,
        bloodType: selectedBloodType,
        location: region,
        isAvailable
      });

      if (result.data.token && result.data.user) {
        await login(result.data.user, result.data.token);
      } else {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      showAlert({ type: 'error', title: 'Registration Failed', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {onBack && (
          <TouchableOpacity 
            onPress={onBack} 
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: palette.bloodRed }]}>
              <Droplets size={24} color={palette.white} fill={palette.white} />
            </View>
            <Text style={[styles.brand, { color: palette.bloodRed }]}>SomaliBD</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Become a Donor</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Fill in your details to register as a life-saver.</Text>
        </View>

        <LabeledField label="Full Name">
          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <User size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Mohamed Ahmed"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>
        </LabeledField>

        <LabeledField label="Email Address">
          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <Mail size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="mohamed@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </LabeledField>

        <LabeledField label="Password">
          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <Lock size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </LabeledField>

        <LabeledField label="Phone Number">
          <View style={styles.fieldWrap}>
            <View style={styles.iconLeft}>
              <Phone size={20} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="+252 61 XXX XXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </LabeledField>

        <Text style={[styles.label, { color: colors.text }]}>Blood Type</Text>
        <View style={styles.bloodGrid}>
          {BLOOD_TYPES.map((type) => {
            const sel = selectedBloodType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.bloodChip, 
                  { backgroundColor: colors.inputBg },
                  sel && { borderColor: palette.bloodRed, backgroundColor: isDark ? '#450a0a' : palette.red50 }
                ]}
                onPress={() => setSelectedBloodType(type)}
              >
                <Text style={[styles.bloodChipText, { color: colors.textMuted }, sel && { color: palette.bloodRed }]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <LabeledField label="Region">
          <TouchableOpacity 
            style={[styles.select, { backgroundColor: colors.inputBg, borderColor: colors.border }]} 
            onPress={() => setShowRegionModal(true)}
          >
            <View style={styles.selectLeft}>
              <MapPin size={20} color={colors.textMuted} />
              <Text style={[styles.selectText, { color: colors.text }, !region && { color: colors.textMuted }]}>
                {region || 'Select your region'}
              </Text>
            </View>
            <ChevronDown size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </LabeledField>

        <View style={[styles.availCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <View style={styles.availText}>
            <Text style={[styles.availTitle, { color: colors.text }]}>Available to Donate</Text>
            <Text style={[styles.availSub, { color: colors.textMuted }]}>Toggle this to appear in urgent searches.</Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: isDark ? palette.slate700 : palette.slate200, true: palette.bloodRed }}
            thumbColor={palette.white}
          />
        </View>

        <TouchableOpacity style={[styles.submit, { backgroundColor: palette.bloodRed }]} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={[styles.submitText, { color: palette.white }]}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onSignIn} style={styles.footerLink}>
          <Text style={[styles.footerMuted, { color: colors.textMuted }]}>
            Already have an account? <Text style={[styles.footerBold, { color: palette.bloodRed }]}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Region</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.modalRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setRegion(r);
                    setShowRegionModal(false);
                  }}
                >
                  <Text style={[styles.modalRowText, { color: colors.text }, region === r && { color: palette.bloodRed }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingVertical: 20, paddingBottom: 48 },
  backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  header: { marginBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  brandIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
  sub: { fontWeight: '600' },
  group: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  fieldWrap: { position: 'relative', justifyContent: 'center' },
  iconLeft: { position: 'absolute', left: 14, zIndex: 1, top: 16 },
  input: { height: 54, borderRadius: 16, paddingLeft: 44, paddingRight: 14, borderWidth: 1, fontWeight: '600' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  bloodChip: { width: '22%', minWidth: 72, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  bloodChipText: { fontWeight: '800', fontSize: 17 },
  select: { height: 54, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectText: { fontWeight: '600' },
  availCard: { padding: 20, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  availText: { flex: 1, paddingRight: 12 },
  availTitle: { fontWeight: '800' },
  availSub: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  submit: { height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontWeight: '900', fontSize: 17 },
  footerLink: { marginTop: 28, alignItems: 'center' },
  footerMuted: { fontWeight: '600' },
  footerBold: { fontWeight: '900' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, maxHeight: '55%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1 },
  modalRowText: { fontSize: 17, fontWeight: '800' },
});
