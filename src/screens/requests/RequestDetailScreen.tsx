import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  MapPin,
  Clock,
  Phone,
  Droplets,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  User,
  Save,
  Settings,
  ClipboardList,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useAlert } from '../../context/AlertContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestDetail'>;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const URGENCY_LEVELS = ['Normal', 'Urgent', 'Emergency'];
const REGIONS = [
  'Banaadir', 'Jubbaland', 'South West', 'Hirshabelle',
  'Galmudug', 'Puntland', 'Somaliland', 'Other',
];

export default function RequestDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { requestData } = route.params;

  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [btPickerOpen, setBtPickerOpen] = useState(false);
  const [urgPickerOpen, setUrgPickerOpen] = useState(false);
  const [regPickerOpen, setRegPickerOpen] = useState(false);

  const [name, setName] = useState(String(requestData.name ?? ''));
  const [phone, setPhone] = useState(String(requestData.phone ?? ''));
  const [location, setLocation] = useState(String(requestData.location ?? ''));
  const [bloodType, setBloodType] = useState(String(requestData.type ?? ''));
  const [urgency, setUrgency] = useState(String(requestData.urgency ?? ''));
  const [description, setDescription] = useState(String(requestData.description ?? ''));

  const id = String(requestData._id ?? requestData.id ?? '');

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    })();
  }, []);

  const isOwner =
    (requestData.creatorEmail && requestData.creatorEmail === user?.email) ||
    (!requestData.creatorEmail && requestData.name === user?.name);

  const urgColor =
    urgency === 'Emergency' ? palette.red500 :
    urgency === 'Urgent' ? '#D97706' :
    palette.green600;

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !location.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all fields' });
      return;
    }
    setIsSaving(true);
    try {
      await api.put(`/api/requests/${id}`, { name, phone, location, type: bloodType, urgency, description });
      showAlert({ type: 'success', title: 'Success', message: 'Your request has been updated!' });
      setIsEditing(false);
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Failed to update request' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/requests/${id}`);
      setDeleteModal(false);
      showAlert({
        type: 'success',
        title: 'Deleted',
        message: 'Your request has been removed.',
        onConfirm: () => navigation.goBack()
      });
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Error', message: err?.response?.data?.message || 'Failed to delete' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Immersive Red Header (same as Profile) ── */}
          <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
            <View style={styles.headerBlob} />
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={22} color={palette.white} />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Request' : 'Request Details'}
              </Text>

              {isOwner ? (
                <TouchableOpacity
                  style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}
                  onPress={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                >
                  {isEditing
                    ? <X size={20} color={palette.white} />
                    : <Edit3 size={20} color={palette.white} />
                  }
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>
          </View>

          {/* ── Main Card (pulled up over header, same as profile) ── */}
          <View style={styles.body}>
            <View style={[
              styles.card, 
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                shadowColor: isDark ? 'rgba(0,0,0,0.8)' : '#000',
                shadowOpacity: isDark ? 0.3 : 0.1
              }
            ]}>

              {/* Blood type icon circle */}
              <View style={styles.iconWrap}>
                <View style={[styles.bigIcon, { backgroundColor: palette.bloodRed }]}>
                  <Droplets size={28} color={palette.white} />
                  <Text style={styles.bigIconText}>{bloodType}</Text>
                </View>
                <View style={[styles.urgBadge, { backgroundColor: urgColor }]}>
                  <Text style={styles.urgBadgeText}>{urgency.toUpperCase()}</Text>
                </View>
              </View>

              {/* ── VIEW MODE ── */}
              {!isEditing ? (
                <>
                  <Text style={[styles.reqName, { color: colors.text }]}>{name}</Text>
                  <View style={styles.locRow}>
                    <MapPin size={15} color={palette.bloodRed} />
                    <Text style={[styles.locText, { color: colors.textMuted }]}>{location}</Text>
                  </View>

                  {/* Edit pill button — same as Profile */}
                  {isOwner && (
                    <TouchableOpacity
                      style={[styles.editPill, { backgroundColor: colors.inputBg }]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Edit3 size={16} color={colors.textMuted} />
                      <Text style={[styles.editPillText, { color: colors.text }]}>Edit Request</Text>
                    </TouchableOpacity>
                  )}

                  {/* Info rows */}
                  <View style={[
                    styles.infoCard, 
                    { 
                      backgroundColor: colors.inputBg,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1,
                      shadowColor: '#000',
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowRadius: 10,
                      elevation: isDark ? 0 : 2
                    }
                  ]}>
                    <InfoRow icon={<User size={16} color="#3B82F6" />} label="Requester" value={name} colors={colors} />
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    <InfoRow icon={<Phone size={16} color="#22C55E" />} label="Phone" value={phone} colors={colors} />
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    <InfoRow icon={<Droplets size={16} color={palette.bloodRed} />} label="Blood Type" value={bloodType} colors={colors} />
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    <InfoRow icon={<MapPin size={16} color={palette.bloodRed} />} label="Region" value={location} colors={colors} />
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    <InfoRow icon={<AlertTriangle size={16} color={urgColor} />} label="Urgency" value={urgency} colors={colors} valueColor={urgColor} />
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    <InfoRow
                      icon={<Clock size={16} color={colors.textMuted} />}
                      label="Posted On"
                      value={requestData.createdAt
                        ? new Date(String(requestData.createdAt)).toLocaleDateString('en-US', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : '—'}
                      colors={colors}
                    />
                    {!!description && (
                      <>
                        <View style={[styles.sep, { backgroundColor: colors.border }]} />
                        <InfoRow
                          icon={<ClipboardList size={16} color={colors.textMuted} />}
                          label="Description / Reason"
                          value={description}
                          colors={colors}
                          multiline
                        />
                      </>
                    )}
                  </View>

                  {/* Delete button for owner */}
                  {isOwner && (
                    <TouchableOpacity
                      style={[styles.deletePill, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : palette.red50 }]}
                      onPress={() => setDeleteModal(true)}
                    >
                      <Trash2 size={16} color={palette.red500} />
                      <Text style={[styles.deletePillText, { color: palette.red500 }]}>Delete Request</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                /* ── EDIT MODE (styled like Profile FieldRow) ── */
                <>
                  <Text style={[styles.reqName, { color: colors.text }]}>Edit Your Request</Text>
                  <Text style={[styles.editSubtitle, { color: colors.textMuted }]}>Update the details below and save</Text>

                  {/* Name */}
                  <FieldRow icon={<User size={16} color="#3B82F6" />} colors={colors}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Requester Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </FieldRow>

                  {/* Phone */}
                  <FieldRow icon={<Phone size={16} color="#22C55E" />} colors={colors}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Phone Number"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </FieldRow>

                  {/* Blood Type picker */}
                  <FieldRow icon={<Droplets size={16} color={palette.bloodRed} />} colors={colors} onPress={() => setBtPickerOpen(true)}>
                    <Text style={[styles.input, { color: bloodType ? colors.text : colors.textMuted }]}>
                      {bloodType || 'Select Blood Type'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </FieldRow>

                  {/* Urgency picker */}
                  <FieldRow icon={<AlertTriangle size={16} color={urgColor} />} colors={colors} onPress={() => setUrgPickerOpen(true)}>
                    <Text style={[styles.input, { color: urgency ? colors.text : colors.textMuted }]}>
                      {urgency || 'Select Urgency'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </FieldRow>

                  {/* Region picker */}
                  <FieldRow icon={<MapPin size={16} color={palette.bloodRed} />} colors={colors} onPress={() => setRegPickerOpen(true)}>
                    <Text style={[styles.input, { color: location ? colors.text : colors.textMuted }]}>
                      {location || 'Select Region'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </FieldRow>

                  {/* Description */}
                  <Text style={[styles.fieldLabel, { color: colors.textMuted, alignSelf: 'flex-start', paddingLeft: 2, marginBottom: -4 }]}>DESCRIPTION (REASON)</Text>
                  <TextInput
                    style={[styles.descInput, { 
                      backgroundColor: colors.inputBg, 
                      borderColor: isDark ? colors.border : palette.slate200,
                      borderWidth: 1.5,
                      color: colors.text,
                    }]}
                    placeholder="e.g. Emergency surgery, accident victim..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  {/* Action buttons row — same as Profile */}
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { backgroundColor: colors.inputBg }]}
                      onPress={() => setIsEditing(false)}
                    >
                      <X size={18} color={colors.textMuted} />
                      <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: palette.bloodRed }, isSaving && { opacity: 0.7 }]}
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? <ActivityIndicator color={palette.white} size="small" />
                        : <>
                            <Save size={18} color={palette.white} />
                            <Text style={[styles.saveBtnText, { color: palette.white }]}>Save</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Picker Modals ── */}
      <PickerModal
        visible={btPickerOpen}
        title="Select Blood Type"
        options={BLOOD_TYPES}
        selected={bloodType}
        onSelect={(v) => { setBloodType(v); setBtPickerOpen(false); }}
        onClose={() => setBtPickerOpen(false)}
        colors={colors}
        isDark={isDark}
      />
      <PickerModal
        visible={urgPickerOpen}
        title="Select Urgency"
        options={URGENCY_LEVELS}
        selected={urgency}
        onSelect={(v) => { setUrgency(v); setUrgPickerOpen(false); }}
        onClose={() => setUrgPickerOpen(false)}
        colors={colors}
        isDark={isDark}
      />
      <PickerModal
        visible={regPickerOpen}
        title="Select Region"
        options={REGIONS}
        selected={location}
        onSelect={(v) => { setLocation(v); setRegPickerOpen(false); }}
        onClose={() => setRegPickerOpen(false)}
        colors={colors}
        isDark={isDark}
      />

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDeleteModal(false)}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={[styles.modalIconBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : palette.red50 }]}>
              <AlertTriangle size={36} color={palette.red500} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Request?</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              This will permanently remove your blood request. This cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.modalDangerBtn, { backgroundColor: palette.red500 }]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? <ActivityIndicator color={palette.white} />
                : <Text style={styles.modalDangerBtnText}>Yes, Delete</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => setDeleteModal(false)}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Sub-components ─── */

function FieldRow({
  icon, children, colors, onPress,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  colors: any;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.fieldRow, { backgroundColor: colors.inputBg }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon}
      {children}
    </Wrapper>
  );
}

function InfoRow({
  icon, label, value, colors, valueColor, multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.infoRow, multiline && { alignItems: 'flex-start' }]}>
      <View style={[styles.infoIconWrap, multiline && { marginTop: 2 }]}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor ?? colors.text }, multiline && { lineHeight: 22 }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function PickerModal({
  visible, title, options, selected, onSelect, onClose, colors, isDark,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
          <View style={styles.pickerHead}>
            <Text style={[styles.pickerHeadTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.pickerCloseBtn, { backgroundColor: colors.inputBg }]}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {options.map((opt) => {
            const active = selected === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.pickerItem,
                  { borderBottomColor: colors.border },
                  active && { backgroundColor: isDark ? 'rgba(211,47,47,0.12)' : palette.red50 },
                ]}
                onPress={() => onSelect(opt)}
              >
                <Text style={[styles.pickerItemText, { color: active ? palette.bloodRed : colors.text }]}>
                  {opt}
                </Text>
                {active && <Check size={18} color={palette.bloodRed} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  /* Header — identical to ProfileScreen */
  header: {
    paddingBottom: 72,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontWeight: '900',
    fontSize: 22,
    color: palette.white,
  },

  /* Body — pulled up over header, same as Profile */
  scroll: { paddingBottom: 40 },
  body: { marginTop: -56, paddingHorizontal: 22, zIndex: 2 },
  card: {
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 18,
    elevation: 6,
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },

  /* Blood icon */
  iconWrap: { marginBottom: 16, position: 'relative' },
  bigIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bigIconText: { color: palette.white, fontSize: 22, fontWeight: '900' },
  urgBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: palette.white,
  },
  urgBadgeText: { color: palette.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

  /* View mode */
  reqName: { fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  locText: { fontWeight: '700' },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 20,
  },
  editPillText: { fontWeight: '800' },
  infoCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  infoIconWrap: { width: 28, alignItems: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700' },
  sep: { height: 1 },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  deletePillText: { fontWeight: '800' },

  /* Edit mode — matches ProfileScreen exactly */
  editSubtitle: { fontSize: 13, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    width: '100%',
    marginBottom: 12,
  },
  input: { flex: 1, fontWeight: '800', fontSize: 14 },
  editActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtnText: { fontWeight: '800' },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { fontWeight: '800' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  descInput: {
    width: '100%',
    minHeight: 96,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 22,
  },

  /* Modals */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  modalDesc: { textAlign: 'center', lineHeight: 21, fontSize: 14, paddingHorizontal: 4, marginBottom: 22 },
  modalDangerBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDangerBtnText: { color: palette.white, fontWeight: '900', fontSize: 15 },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCancelBtnText: { fontWeight: '800', fontSize: 15 },

  /* Picker bottom sheet */
  pickerSheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerHeadTitle: { fontSize: 18, fontWeight: '900' },
  pickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: 16, fontWeight: '700' },
});
