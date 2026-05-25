import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  MapPin,
  Clock,
  Droplets,
  Filter,
  ChevronRight,
  Bell,
  Trash2,
  AlertTriangle,
  X,
  Menu,
  ChevronLeft,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { SOCKET_URL } from '../../config';
import { useTheme, palette } from '../../theme/colors';
import { useGlobalCall } from '../../context/CallContext';
import { useNavigation } from '@react-navigation/native';
import { useRootNavigation } from '../../navigation/useRootNavigation';
import { useAppUI } from '../../context/AppUIContext';
import { useAlert } from '../../context/AlertContext';

// No local socket here, using Global Socket

export default function RequestsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const rootNav = useRootNavigation();
  const { openSidebar } = useAppUI();
  const { socket } = useGlobalCall();
  const [filter, setFilter] = useState('All');
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await AsyncStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
        const { data } = await api.get('/api/requests');
        setRequests(Array.isArray(data) ? data : []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();

    if (!socket) return;
    
    const onNew = (newRequest: Record<string, unknown>) => {
      setRequests((prev) => [newRequest, ...prev]);
    };
    const onDel = (requestId: string) => {
      setRequests((prev) => prev.filter((req) => String(req._id ?? req.id) !== requestId));
    };
    const onUpd = (updated: any) => {
      setRequests((prev) => prev.map((req) => (String(req._id || req.id) === String(updated._id || updated.id) ? updated : req)));
    };
    socket.on('newRequest', onNew);
    socket.on('deleteRequest', onDel);
    socket.on('updateRequest', onUpd);
    return () => {
      socket.off('newRequest', onNew);
      socket.off('deleteRequest', onDel);
      socket.off('updateRequest', onUpd);
    };
  }, [socket]);

  const bloodTypes = ['All', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  let filtered = filter === 'All' ? requests : requests.filter((req) => req.type === filter);
  const q = search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((req) => {
      const loc = String(req.location ?? '').toLowerCase();
      const typ = String(req.type ?? '').toLowerCase();
      const nam = String(req.name ?? '').toLowerCase();
      return loc.includes(q) || typ.includes(q) || nam.includes(q);
    });
  }

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await api.delete(`/api/requests/${deleteModal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests((prev) => prev.filter((req) => String(req._id ?? req.id) !== deleteModal.id));
      setDeleteModal({ open: false, id: null });
      showAlert({ type: 'success', title: 'Success', message: 'Request deleted successfully' });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete request';
      showAlert({ type: 'error', title: 'Error', message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={[styles.iconBox, { backgroundColor: colors.inputBg }]} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('blood_requests')}</Text>
          <TouchableOpacity style={[styles.iconBox, { backgroundColor: colors.inputBg }]}>
            <Bell size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <View style={[styles.searchField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('search_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: palette.bloodRed }]}>
            <Filter size={20} color={palette.white} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chipsRow}>
            {bloodTypes.map((type) => {
              const on = filter === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, { backgroundColor: colors.inputBg }, on && { backgroundColor: palette.bloodRed }]}
                  onPress={() => setFilter(type)}
                >
                  <Text style={[styles.chipText, { color: colors.textMuted }, on && { color: palette.white }]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerBig}>
            <ActivityIndicator color={palette.bloodRed} size="large" />
            <Text style={[styles.loading, { color: colors.textMuted }]}>{t('loading_requests')}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerBig}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
              <Droplets size={40} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('no_requests_found')}</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>{t('no_requests_desc')}</Text>
          </View>
        ) : (
          filtered.map((req) => {
            const id = String(req._id ?? req.id ?? '');
            const urg = String(req.urgency ?? '');
            // Check ownership by email (new requests) or name (fallback/legacy)
            const creatorEmail = String(req.creatorEmail ?? '');
            const reqName = String(req.name ?? '');
            const isOwner = (creatorEmail && creatorEmail === user?.email) ||
                          (!creatorEmail && reqName === user?.name);
            
            return (
              <TouchableOpacity
                key={id || Math.random()}
                style={[styles.card, { 
                  backgroundColor: colors.card, 
                  borderColor: isDark ? colors.border : palette.slate200,
                }]}
                onPress={() => {
                  if (isOwner) {
                    rootNav.navigate('RequestDetail', { requestData: req });
                  } else {
                    const hasDonated = (req.donors as string[] || []).includes(user?.email || '');
                    if (hasDonated) {
                      showAlert({ type: 'info', title: 'Already Donated', message: 'You have already committed to help this person.' });
                    } else {
                      rootNav.navigate('DonateAction', { requestData: req });
                    }
                  }
                }}
                activeOpacity={0.85}
              >
                {urg === 'Emergency' ? (
                  <View style={[styles.emBadge, { backgroundColor: palette.red500 }]}>
                    <Text style={styles.emBadgeText}>EMERGENCY</Text>
                  </View>
                ) : null}
                <View style={styles.cardRow}>
                  <View style={[styles.typeBox, { backgroundColor: isDark ? 'rgba(211, 47, 47, 0.1)' : palette.red50 }]}>
                    <Text style={[styles.typeText, { color: palette.bloodRed }]}>{String(req.type)}</Text>
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{String(req.name)}</Text>
                    <View style={styles.metaRow}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        {req.createdAt
                          ? new Date(String(req.createdAt)).toLocaleDateString()
                          : '—'}
                      </Text>
                      <View style={{ marginLeft: 10 }}>
                        <MapPin size={12} color={colors.textMuted} />
                      </View>
                      <Text style={[styles.meta, { color: colors.textMuted }]}>{String(req.distance || 'Nearby')}</Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <ChevronRight size={24} color={colors.border} />
                  </View>
                </View>
                <View style={[styles.locBar, { backgroundColor: colors.inputBg }]}>
                  <MapPin size={14} color={palette.bloodRed} />
                  <Text style={[styles.locText, { color: colors.textMuted }]} numberOfLines={1}>
                    {String(req.location)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  {!isOwner ? (
                    <View 
                      style={[
                        styles.donateBtn, 
                        { backgroundColor: (req.donors as string[] || []).includes(user?.email || '') ? palette.green600 : palette.bloodRed }
                      ]}
                    >
                      <Text style={[styles.donateBtnText, { color: palette.white }]}>
                        {(req.donors as string[] || []).includes(user?.email || '') ? 'Donated' : t('donate_now')}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.donateBtn, { backgroundColor: isDark ? 'rgba(211,47,47,0.12)' : palette.red50 }]}>
                      <Text style={[styles.donateBtnText, { color: palette.bloodRed }]}>View & Edit My Request</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={deleteModal.open} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: palette.blackOverlay60 }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDeleteModal({ open: false, id: null })}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.modalCenter}>
              <View style={[styles.modalIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : palette.red50 }]}>
                <AlertTriangle size={40} color={palette.red500} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('delete_request_title')}</Text>
              <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{t('delete_request_desc')}</Text>
              <TouchableOpacity style={[styles.modalDanger, { backgroundColor: palette.red500 }]} onPress={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <Text style={[styles.modalDangerText, { color: palette.white }]}>{t('yes_delete')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: colors.inputBg }]}
                onPress={() => setDeleteModal({ open: false, id: null })}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    paddingHorizontal: 22,
    paddingTop: 0,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '900', flex: 1, textAlign: 'center' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: { marginTop: 8 },
  chipsRow: { flexDirection: 'row', paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  chipText: { fontSize: 13, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, gap: 0 },
  centerBig: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loading: { marginTop: 12, fontWeight: '800' },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontWeight: '900', fontSize: 17 },
  emptySub: { textAlign: 'center', maxWidth: 220, marginTop: 8, fontSize: 13 },
  card: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: palette.bloodRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  emBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
    zIndex: 2,
  },
  emBadgeText: { color: palette.white, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { fontWeight: '900', fontSize: 18 },
  cardMid: { flex: 1 },
  cardName: { fontWeight: '800', fontSize: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  meta: { fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  locText: { flex: 1, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  donateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  donateBtnText: { fontWeight: '900' },
  shareBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  shareBtnText: { fontWeight: '900' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 26,
  },
  modalClose: { position: 'absolute', top: 18, right: 18, zIndex: 2 },
  modalCenter: { alignItems: 'center' },
  modalIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  modalDesc: {
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  modalDanger: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDangerText: { fontWeight: '900' },
  modalCancel: { width: '100%', paddingVertical: 14, borderRadius: 16 },
  modalCancelText: { textAlign: 'center', fontWeight: '900' },
});
