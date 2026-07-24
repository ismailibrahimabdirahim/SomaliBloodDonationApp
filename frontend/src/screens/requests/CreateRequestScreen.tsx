import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MapPin, Info, CircleCheck, ChevronDown, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { REGIONS, BLOOD_TYPES } from '../../config';
import { useTheme, palette } from '../../theme/colors';
import type { MainTabParamList } from '../../navigation/types';
import { useAlert } from '../../context/AlertContext';

export default function CreateRequestScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'PostRequest'>>();
  const [selectedBloodType, setSelectedBloodType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [patientName, setPatientName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [errors, setErrors] = useState<{ bloodType?: boolean; region?: boolean; urgency?: boolean; description?: boolean; proofImage?: boolean; patientName?: boolean; hospitalName?: boolean; contactEmail?: boolean }>({});
  const [proofImage, setProofImage] = useState('');
  
  const scrollRef = useRef<ScrollView>(null);
  const descRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw) as { email?: string; profileImage?: string };
        if (user.email) {
          setUserEmail(user.email);
          setContactEmail(user.email);
        }
        if (user.profileImage) setUserProfileImage(user.profileImage);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    const newErrors: { bloodType?: boolean; region?: boolean; urgency?: boolean; description?: boolean; proofImage?: boolean; patientName?: boolean; hospitalName?: boolean; contactEmail?: boolean } = {};
    if (!selectedBloodType) newErrors.bloodType = true;
    if (!region) newErrors.region = true;
    if (!urgency) newErrors.urgency = true;
    if (!description.trim()) newErrors.description = true;
    if (!proofImage) newErrors.proofImage = true;
    if (!patientName.trim()) newErrors.patientName = true;
    if (!hospitalName.trim()) newErrors.hospitalName = true;
    if (!contactEmail.trim()) newErrors.contactEmail = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all highlighted fields' });
      return;
    }

    setErrors({});
    performSubmit();
  };


  const performSubmit = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('user');
      const user = JSON.parse(raw || '{}') as { name?: string };
      
      console.log('[PostRequest] Sending to server...');
      const response = await api.post('/api/requests', {
        name: user.name || 'Anonymous User',
        type: selectedBloodType,
        location: region,
        urgency,
        description,
        proofImage,
        patientName,
        hospitalName,
        contactEmail,
      });

      if (response.status === 201 || response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          navigation.navigate('Requests');
        }, 1800);
      }
    } catch (err: any) {
      console.error('[PostRequest] Failed:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Connection lost. Please check your internet and try again.';
      showAlert({ type: 'error', title: 'Submission Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : palette.green50 }]}>
          <CircleCheck size={48} color={palette.green500} />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Request Sent!</Text>
        <Text style={[styles.successSub, { color: colors.textMuted }]}>Your request has been broadcasted to donors in {region}.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => navigation.navigate('Home')}>
            <ArrowLeft size={24} color={palette.white} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.white }]}>Create Request</Text>
          <Image
            style={[styles.headerAvatar, { borderColor: 'rgba(255,255,255,0.35)' }]}
            source={{
              uri: userProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail || 'User')}&background=random&color=fff`,
            }}
          />
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.h1, { color: colors.text }]}>{t('need_blood')}</Text>
        <Text style={[styles.lead, { color: colors.textMuted }]}>{t('fill_details')}</Text>

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.patientName && { color: palette.red500 }]}>PATIENT NAME {errors.patientName && '*'}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, borderColor: errors.patientName ? palette.red500 : colors.border, color: colors.text },
            errors.patientName && { borderWidth: 1.5 }
          ]}
          placeholder="e.g. Jamac"
          placeholderTextColor={colors.textMuted}
          value={patientName}
          onChangeText={(text) => {
            setPatientName(text);
            if (errors.patientName) setErrors(prev => ({ ...prev, patientName: false }));
          }}
        />

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.hospitalName && { color: palette.red500 }]}>HOSPITAL NAME {errors.hospitalName && '*'}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, borderColor: errors.hospitalName ? palette.red500 : colors.border, color: colors.text },
            errors.hospitalName && { borderWidth: 1.5 }
          ]}
          placeholder="e.g. Martini Hospital, Mogadishu"
          placeholderTextColor={colors.textMuted}
          value={hospitalName}
          onChangeText={(text) => {
            setHospitalName(text);
            if (errors.hospitalName) setErrors(prev => ({ ...prev, hospitalName: false }));
          }}
        />

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.contactEmail && { color: palette.red500 }]}>YOUR EMAIL (FOR CONTACT) {errors.contactEmail && '*'}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, borderColor: errors.contactEmail ? palette.red500 : colors.border, color: colors.text },
            errors.contactEmail && { borderWidth: 1.5 }
          ]}
          placeholder="your.email@example.com"
          placeholderTextColor={colors.textMuted}
          value={contactEmail}
          onChangeText={(text) => {
            setContactEmail(text);
            if (errors.contactEmail) setErrors(prev => ({ ...prev, contactEmail: false }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.sectionLabel, { color: colors.text }, errors.bloodType && { color: palette.red500 }]}>{t('select_blood_type')} {errors.bloodType && '*'}</Text>
        <View style={styles.bloodGrid}>
          {BLOOD_TYPES.map((type) => {
            const on = selectedBloodType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.bloodCell, 
                  { backgroundColor: colors.card, borderColor: errors.bloodType ? palette.red500 : colors.border }, 
                  on && { backgroundColor: palette.bloodRed, borderColor: palette.bloodRed },
                  errors.bloodType && !on && { borderWidth: 1.5 }
                ]}
                onPress={() => {
                  setSelectedBloodType(type);
                  if (errors.bloodType) setErrors(prev => ({ ...prev, bloodType: false }));
                }}
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

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.region && { color: palette.red500 }]}>{t('region')} {errors.region && '*'}</Text>
        <TouchableOpacity 
          style={[
            styles.select, 
            { backgroundColor: colors.inputBg, borderColor: errors.region ? palette.red500 : colors.border },
            errors.region && { borderWidth: 1.5 }
          ]} 
          onPress={() => {
            setErrors(prev => ({ ...prev, region: false }));
            setShowRegionModal(true);
          }}
        >
          <Text style={[styles.selectTxt, { color: colors.text }, !region && { color: colors.textMuted }]}>{region || t('select_region')}</Text>
          <ChevronDown size={20} color={errors.region ? palette.red500 : colors.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.urgency && { color: palette.red500 }]}>{t('urgency_level')} {errors.urgency && '*'}</Text>
        <View style={styles.urgRow}>
          {['Emergency', 'Urgent', 'Normal'].map((level) => {
            const on = urgency === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.urgBtn, 
                  { backgroundColor: colors.card, borderColor: errors.urgency ? palette.red500 : colors.border }, 
                  on && { backgroundColor: palette.bloodRed, borderColor: palette.bloodRed },
                  errors.urgency && !on && { borderWidth: 1.5 }
                ]}
                onPress={() => {
                  setUrgency(level);
                  if (errors.urgency) setErrors(prev => ({ ...prev, urgency: false }));
                }}
              >
                <Text style={[styles.urgTxt, { color: colors.textMuted }, on && { color: palette.white }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.description && { color: palette.red500 }]}>DESCRIPTION (REASON) {errors.description && '*'}</Text>
        <TextInput
          ref={descRef}
          style={[styles.descInput, { 
            backgroundColor: colors.inputBg, 
            borderColor: errors.description ? palette.red500 : (isDark ? colors.border : palette.slate200), 
            color: colors.text,
            borderWidth: 1.5,
          }]}
          placeholder="e.g. Emergency surgery, accident victim, post-delivery complication..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description) setErrors(prev => ({ ...prev, description: false }));
          }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={[styles.fieldCap, { color: colors.textMuted }, errors.proofImage && { color: palette.red500 }]}>MEDICAL PROOF (REQUIRED) {errors.proofImage && '*'}</Text>
        <TouchableOpacity
          style={[
            styles.proofUpload,
            { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : palette.slate50,
              borderColor: errors.proofImage ? palette.red500 : (isDark ? colors.border : palette.slate300),
              borderWidth: 2,
              borderStyle: 'dashed'
            },
            errors.proofImage && { borderWidth: 2.5 }
          ]}
          onPress={async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.5,
                base64: true,
              });

              if (!result.canceled && result.assets[0].base64) {
                setProofImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
                if (errors.proofImage) setErrors(prev => ({ ...prev, proofImage: false }));
              }
            } catch (err) {
              showAlert({ type: 'error', title: 'Error', message: 'Failed to open image picker. Please try again.' });
            }
          }}
        >
          {proofImage ? (
            <View style={styles.proofImageContainer}>
              <Image source={{ uri: proofImage }} style={styles.proofPreview} />
              <TouchableOpacity 
                style={styles.removeProofBtn}
                onPress={() => {
                  setProofImage('');
                }}
              >
                <X size={20} color={palette.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.proofPlaceholder}>
              <View style={[styles.proofIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : palette.slate100 }]}>
                <Camera size={32} color={errors.proofImage ? palette.red500 : colors.textMuted} />
              </View>
              <Text style={[styles.proofText, { color: errors.proofImage ? palette.red500 : colors.text }]}>Tap to upload hospital document</Text>
              <Text style={[styles.proofHint, { color: colors.textMuted }]}>Medical report showing patient name, blood type & hospital</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submit, { backgroundColor: palette.bloodRed }]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <>
              <Text style={[styles.submitText, { color: palette.white }]}>{t('send_request')}</Text>
              <Send size={20} color={palette.white} />
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.notice, { backgroundColor: isDark ? 'rgba(211, 47, 47, 0.1)' : palette.red50, borderColor: isDark ? 'rgba(211, 47, 47, 0.2)' : palette.red100 }]}>
          <Info size={24} color={palette.bloodRed} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>{t('important_notice')}</Text>
            <Text style={[styles.noticeBody, { color: colors.textMuted }]}>{t('notice_desc')}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: palette.blackOverlay60 }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('select_region_title')}</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  backBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: 18 },
  headerAvatar: { width: 40, height: 40, borderRadius: 12, borderWidth: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: '900' },
  lead: { marginTop: 8, fontWeight: '600', marginBottom: 22 },
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
  bloodCellOn: {},
  bloodCellText: { fontSize: 18, fontWeight: '900' },
  bloodCellTextOn: {},
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
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 18,
    fontWeight: '800',
  },
  select: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  selectTxt: { fontWeight: '800' },
  selectPh: {},
  phoneWrap: { position: 'relative', marginBottom: 18 },
  phoneInput: {
    height: 52,
    paddingLeft: 16,
    paddingRight: 48,
    borderRadius: 16,
    borderWidth: 1,
    fontWeight: '800',
  },
  phoneIcon: { position: 'absolute', right: 14, top: 16 },
  urgRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  urgBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgBtnOn: {},
  urgTxt: { fontWeight: '800' },
  urgTxtOn: {},
  submit: {
    height: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  submitText: { fontSize: 17, fontWeight: '900' },
  descInput: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 22,
    lineHeight: 22,
  },
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
  noticeBody: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
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
  modalRowTextSel: {},
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
  successSub: { textAlign: 'center', fontWeight: '600' },
  proofUpload: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 22,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofPreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  proofImageContainer: {
    position: 'relative',
    width: '100%',
  },
  removeProofBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  proofPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  proofIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofText: { fontWeight: '800', fontSize: 15 },
  proofHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
});
