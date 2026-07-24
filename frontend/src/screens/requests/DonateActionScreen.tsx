import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MapPin, Phone, Clock, Send, CircleCheck, Info, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { REGIONS } from '../../config';
import { useTheme, palette } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';
import { useAlert } from '../../context/AlertContext';
import type { RootStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'DonateAction'>;

export default function DonateActionScreen({ route, navigation }: Props) {
  const { requestData } = route.params;
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const name = String(requestData.name ?? '');
  const reqType = String(requestData.type ?? '');
  const reqLoc = String(requestData.location ?? '');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [arrival, setArrival] = useState('immediate');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const fallbackTimerRef = React.useRef<any>(null);

  const firstName = name.split(' ')[0] || name;
  const recipientEmail = String((requestData as Record<string, unknown>).creatorEmail || (requestData as Record<string, unknown>).user || `${firstName.replace(/\s+/g, '').toLowerCase()}@somalibd.chat`);

  const submit = async () => {
    if (!region || !phone) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
      return;
    }

    // Somali Phone Validation
    const somaliPhoneRegex = /^(?:\+252|0)?(61|62|63|65|68|69|70|71|79|90)\d{7}$/;
    if (!somaliPhoneRegex.test(phone.replace(/\s+/g, ''))) {
      showAlert({ type: 'error', title: 'Invalid Phone', message: 'Please enter a valid Somali phone number (e.g. 615825058)' });
      return;
    }

    setOtpInput('');
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(newCode);
    setShowOtpModal(true);

    // Simulate SMS arrival
    setTimeout(() => {
      showAlert({
        type: 'success',
        title: '💬 SMS: Sombdonate',
        message: `Your donation verification code is: ${newCode}`
      });

      // Magic Auto-fill: Simulate the phone "reading" the SMS after another 1.5 seconds
      setTimeout(() => {
        setOtpInput(newCode);
      }, 1500);
    }, 1500);
  };

  const handleVerifyOtp = async () => {
    if (otpInput.trim() === generatedCode.trim()) {
      setShowOtpModal(false);
      performSubmit();
    } else {
      showAlert({ type: 'error', title: 'Invalid OTP', message: 'The verification code you entered is incorrect.' });
    }
  };

  const performSubmit = async () => {
    setLoading(true);
    try {
      const realRecipient = (requestData as any).creatorEmail || (requestData as any).userEmail || recipientEmail;

      console.log('[Donate] Notifying:', realRecipient);

      const introMessage = `Hello! I would like to donate ${reqType} blood for your request. I am in ${region} and my phone number is ${phone}. I can arrive ${arrival === 'immediate' ? 'immediately' : arrival === '30min' ? 'within 30 minutes' : arrival === '1hour' ? 'within 1 hour' : 'later today'}.`;

      await api.post('/api/messages', {
        text: introMessage,
        recipient: realRecipient,
      });

      // Track donation in backend
      const reqId = requestData._id || (requestData as any).id;
      if (reqId) {
        await api.post(`/api/requests/${reqId}/donate`);
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('[Donate] Error:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Connection lost. Please check your internet and try again.';
      showAlert({ type: 'error', title: 'Donation Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIcon}>
          <CircleCheck size={48} color={palette.green600} />
        </View>
        <Text style={styles.successTitle}>Thank You, Hero!</Text>
        <Text style={styles.successSub}>
          Your details have been sent to {name}. They will contact you shortly.
        </Text>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => {
            navigation.replace('Chat', { recipientName: name, recipientEmail });
          }}
        >
          <Send size={18} color={palette.white} />
          <Text style={styles.chatBtnText}>Chat with {firstName}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
        <TouchableOpacity style={styles.backRound} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={palette.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donate Now</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.typeBox}>
              <Text style={styles.typeText}>{reqType}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Helping {name}</Text>
              <View style={styles.locRow}>
                <MapPin size={12} color={palette.slate400} />
                <Text style={styles.loc}>{reqLoc}</Text>
              </View>
            </View>
          </View>

          {(requestData as any).description && (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>DESCRIPTION / REASON</Text>
              <Text style={styles.descText}>{String((requestData as any).description)}</Text>
            </View>
          )}

          <View style={styles.noticePink}>
            <Heart size={20} color={palette.bloodRed} fill={palette.bloodRed} />
            <Text style={styles.noticePinkText}>
              By confirming, you commit to help. Provide accurate details so they can reach you.
            </Text>
          </View>
        </View>

        <Text style={styles.cap}>YOUR REGION</Text>
        <TouchableOpacity style={styles.select} onPress={() => setShowRegionModal(true)}>
          <Text style={[styles.selectTxt, !region && styles.selectPh]}>{region || 'Select Your Region'}</Text>
          <MapPin size={20} color={palette.slate400} />
        </TouchableOpacity>

        <Text style={styles.cap}>YOUR PHONE NUMBER</Text>
        <View style={styles.phoneWrap}>
          <TextInput
            style={styles.input}
            placeholder="+252 --- --- ---"
            placeholderTextColor={palette.slate400}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <View style={styles.phoneIcon}>
            <Phone size={20} color={palette.slate400} />
          </View>
        </View>

        <Text style={styles.cap}>ESTIMATED ARRIVAL</Text>
        <TouchableOpacity style={styles.select} onPress={() => setShowArrivalModal(true)}>
          <Text style={styles.selectTxt}>
            {arrival === 'immediate'
              ? 'Coming Immediately'
              : arrival === '30min'
                ? 'Within 30 Minutes'
                : arrival === '1hour'
                  ? 'Within 1 Hour'
                  : 'Later Today'}
          </Text>
          <Clock size={20} color={palette.slate400} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirm} onPress={submit}>
          <Text style={styles.confirmText}>Confirm Donation</Text>
          <Heart size={20} color={palette.white} fill={palette.white} />
        </TouchableOpacity>

        <View style={styles.privacy}>
          <Info size={24} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Donor Privacy</Text>
            <Text style={styles.privacyBody}>
              Your contact information will only be shared with the requester to coordinate the donation.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <X size={24} color={palette.slate400} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.modalRow}
                  onPress={() => {
                    setRegion(r);
                    setShowRegionModal(false);
                  }}
                >
                  <Text style={[styles.modalRowText, region === r && { color: palette.bloodRed }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showArrivalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '50%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Estimated Arrival</Text>
              <TouchableOpacity onPress={() => setShowArrivalModal(false)}>
                <X size={24} color={palette.slate400} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Coming Immediately', value: 'immediate' },
              { label: 'Within 30 Minutes', value: '30min' },
              { label: 'Within 1 Hour', value: '1hour' },
              { label: 'Later Today', value: 'today' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.modalRow}
                onPress={() => {
                  setArrival(opt.value);
                  setShowArrivalModal(false);
                }}
              >
                <Text style={[styles.modalRowText, arrival === opt.value && { color: colors.bloodRed }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* OTP Verification Overlay - Solid Fix */}
      {showOtpModal && (
        <View style={[styles.customModalOverlay, { backgroundColor: palette.blackOverlay60 }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.otpKeyboardAvoid}
          >
            <View style={[styles.otpSheet, { backgroundColor: palette.white }]}>
              <View style={styles.otpHeader}>
                <View style={styles.otpIconBox}>
                  <Send size={30} color={palette.bloodRed} />
                </View>
                <Text style={styles.otpTitle}>Verify Phone</Text>
                <Text style={styles.otpSub}>
                  We sent a 6-digit code to {phone}. Enter it below to verify your identity.
                </Text>
              </View>

              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={palette.slate400}
                keyboardType="number-pad"
                maxLength={6}
                value={otpInput}
                onChangeText={setOtpInput}
                autoFocus
              />

              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerifyOtp}
                disabled={isVerifying}
              >
                {isVerifying ? <ActivityIndicator color="white" /> : <Text style={styles.verifyBtnText}>Verify & Confirm</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setShowOtpModal(false);
                  setLoading(false);
                  setIsVerifying(false);
                  setOtpInput('');
                }}
                style={styles.otpCancel}
              >
                <Text style={{ color: palette.slate400, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.slate50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.bloodRed,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backRound: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: palette.white, fontWeight: '900', fontSize: 20 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 48 },
  card: {
    backgroundColor: palette.white,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.slate100,
    marginBottom: 22,
  },
  cardTop: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  typeBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: palette.red50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { fontWeight: '900', fontSize: 18, color: palette.bloodRed },
  cardTitle: { fontWeight: '900', fontSize: 17, color: palette.slate900 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  loc: { fontSize: 12, color: palette.slate500 },
  noticePink: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: palette.red50,
    padding: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  noticePinkText: { flex: 1, fontSize: 12, color: palette.slate600, lineHeight: 18, fontWeight: '600' },
  descBox: {
    backgroundColor: palette.slate50,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.slate100,
  },
  descLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: palette.slate400,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: palette.slate700,
    lineHeight: 20,
    fontWeight: '700',
  },
  cap: {
    fontSize: 11,
    fontWeight: '900',
    color: palette.slate400,
    marginBottom: 8,
    marginLeft: 6,
    letterSpacing: 1,
  },
  select: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.slate100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectTxt: { fontWeight: '800', color: palette.slate900 },
  selectPh: { color: palette.slate400 },
  phoneWrap: { marginBottom: 16 },
  input: {
    height: 52,
    paddingLeft: 16,
    paddingRight: 44,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.slate100,
    fontWeight: '800',
  },
  phoneIcon: { position: 'absolute', right: 14, top: 16 },
  confirm: {
    height: 58,
    borderRadius: 16,
    backgroundColor: palette.bloodRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  confirmText: { color: palette.white, fontSize: 17, fontWeight: '900' },
  privacy: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
    padding: 18,
    borderRadius: 22,
    backgroundColor: palette.blue50,
    borderWidth: 1,
    borderColor: palette.blue100,
  },
  privacyTitle: { fontWeight: '900', color: palette.slate900, marginBottom: 6 },
  privacyBody: { fontSize: 12, color: palette.slate500, lineHeight: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: palette.blackOverlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '72%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: palette.slate900 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.slate50 },
  modalRowText: { fontSize: 17, fontWeight: '800', color: palette.slate700 },
  successRoot: { flex: 1, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: { fontSize: 24, fontWeight: '900', color: palette.slate900, marginBottom: 10, textAlign: 'center' },
  successSub: { textAlign: 'center', color: palette.slate500, marginBottom: 26, fontWeight: '600' },
  chatBtn: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    borderRadius: 16,
    backgroundColor: palette.bloodRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  chatBtnText: { color: palette.white, fontWeight: '900' },
  backLink: { marginTop: 16, color: palette.slate400, fontWeight: '800' },
  customModalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  otpKeyboardAvoid: { width: '100%', alignItems: 'center' },
  otpSheet: {
    width: '85%',
    padding: 25,
    borderRadius: 28,
    backgroundColor: 'white',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  otpHeader: { alignItems: 'center', marginBottom: 20 },
  otpIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  otpTitle: { fontSize: 22, fontWeight: '900', color: palette.slate900, marginBottom: 8 },
  otpSub: { textAlign: 'center', color: palette.slate500, fontSize: 13, lineHeight: 18, paddingHorizontal: 10 },
  otpInput: {
    width: '100%',
    height: 64,
    borderRadius: 16,
    backgroundColor: palette.slate50,
    borderWidth: 1.5,
    borderColor: palette.slate100,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 12,
    marginBottom: 20,
    color: palette.slate900,
    paddingLeft: 12,
  },
  verifyBtn: { width: '100%', height: 56, borderRadius: 16, backgroundColor: palette.bloodRed, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  otpCancel: { marginTop: 15 },
});
