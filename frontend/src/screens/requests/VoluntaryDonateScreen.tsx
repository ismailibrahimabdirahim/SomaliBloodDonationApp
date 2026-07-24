import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, CircleCheck, ChevronDown, MapPin, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { BLOOD_TYPES, REGIONS } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

export default function VoluntaryDonateScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedBloodType, setSelectedBloodType] = useState(user?.bloodType || '');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);

  const handleSubmit = async () => {
    if (!selectedBloodType) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select your blood type' });
      return;
    }
    if (!region) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select your region' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/inventory/donate', {
        bloodType: selectedBloodType,
        location: region,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigation.goBack();
      }, 2200);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit donation';
      showAlert({ type: 'error', title: 'Error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : palette.green50 }]}>
          <CircleCheck size={48} color={palette.green500} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Donation Submitted!</Text>
        <Text style={[styles.successSub, { color: colors.textMuted }]}>
          Your voluntary donation has been submitted for admin approval. You'll be notified once approved!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={palette.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Heart size={20} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Voluntary Donate</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.h1, { color: colors.text }]}>Save a Life ❤️</Text>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          Submit your blood donation voluntarily. An admin will review and approve it so others can see your available blood.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Your Blood Type</Text>
        <View style={styles.bloodGrid}>
          {BLOOD_TYPES.map((type) => {
            const on = selectedBloodType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.bloodCell,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  on && { backgroundColor: palette.bloodRed, borderColor: palette.bloodRed },
                ]}
                onPress={() => setSelectedBloodType(type)}
              >
                <Text style={[styles.bloodCellText, { color: colors.text }, on && { color: palette.white }]}>{type}</Text>
                {on ? (
                  <View style={[styles.checkBadge, { backgroundColor: palette.white }]}>
                    <CircleCheck size={14} color={palette.bloodRed} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldCap, { color: colors.textMuted }]}>YOUR REGION</Text>
        <TouchableOpacity
          style={[styles.select, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowRegionModal(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color={colors.textMuted} />
            <Text style={[styles.selectTxt, { color: colors.text }, !region && { color: colors.textMuted }]}>
              {region || 'Select Region'}
            </Text>
          </View>
          <ChevronDown size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submit, { backgroundColor: palette.bloodRed }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <>
              <Heart size={20} color={palette.white} />
              <Text style={[styles.submitText, { color: palette.white }]}>Submit Donation</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.notice, { backgroundColor: isDark ? 'rgba(211,47,47,0.1)' : palette.red50, borderColor: isDark ? 'rgba(211,47,47,0.2)' : palette.red100 }]}>
          <Heart size={24} color={palette.bloodRed} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>How It Works</Text>
            <Text style={[styles.noticeBody, { color: colors.textMuted }]}>
              1. Submit your blood type & region{'\n'}
              2. Admin reviews and approves your donation{'\n'}
              3. Your blood becomes visible to everyone who needs it
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: palette.blackOverlay60 }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Region</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.modalRow, { borderBottomColor: colors.border }]}
                  onPress={() => { setRegion(r); setShowRegionModal(false); }}
                >
                  <Text style={[styles.modalRowText, { color: colors.text }, region === r && { color: palette.bloodRed }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  backBtn: { padding: 8, borderRadius: 12 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: '900', fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: '900' },
  lead: { marginTop: 8, fontWeight: '600', marginBottom: 22, lineHeight: 22 },
  sectionLabel: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 22 },
  bloodCell: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodCellText: { fontSize: 18, fontWeight: '900' },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 999,
    padding: 2,
  },
  fieldCap: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    marginLeft: 6,
    letterSpacing: 1,
  },
  select: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  selectTxt: { fontWeight: '800' },
  submit: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: { fontSize: 17, fontWeight: '900' },
  notice: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  noticeTitle: { fontWeight: '900', marginBottom: 6 },
  noticeBody: { fontSize: 12, lineHeight: 20, fontWeight: '600' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successTitle: { fontSize: 28, fontWeight: '900', marginBottom: 10 },
  successSub: { textAlign: 'center', fontWeight: '600', lineHeight: 22 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 26,
    maxHeight: '72%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1 },
  modalRowText: { fontSize: 17, fontWeight: '800' },
});
