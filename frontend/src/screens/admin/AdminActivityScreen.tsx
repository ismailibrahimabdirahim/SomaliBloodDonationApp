import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Trash2, Ban, Shield, Clock, TrendingUp, Menu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

type ActivityLogItem = {
  _id: string;
  action: string;
  description: string;
  adminEmail: string;
  targetType: string;
  targetId: string;
  targetName: string;
  createdAt: string;
};

export default function AdminActivityScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openSidebar } = useAppUI();
  
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const activityLogRes = await api.get('/api/admin/activity-log');
      setActivityLog(activityLogRes.data);
    } catch (err: any) {
      console.error('[AdminActivity] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleClearActivityLog = async () => {
    try {
      await api.delete('/api/admin/activity-log');
      setActivityLog([]);
      setClearModalVisible(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={palette.bloodRed} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={openSidebar}>
            <Menu size={24} color={palette.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Clock size={22} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Activity Log</Text>
          </View>
          {activityLog.length > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => setClearModalVisible(true)}
            >
              <Trash2 size={20} color={palette.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        {activityLog.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity yet.</Text>
        ) : (
          activityLog.map(log => {
            const getIcon = () => {
              switch(log.action) {
                case 'approve': return <CheckCircle size={20} color={palette.green600} />;
                case 'reject': return <XCircle size={20} color={palette.bloodRed} />;
                case 'delete': return <Trash2 size={20} color={palette.bloodRed} />;
                case 'block': return <Ban size={20} color={palette.amber700} />;
                case 'unblock': return <Shield size={20} color={palette.green600} />;
                case 'verify': return <Shield size={20} color={palette.green600} />;
                default: return <Clock size={20} color={colors.textMuted} />;
              }
            };
            
            const getIconBg = () => {
              switch(log.action) {
                case 'approve': return palette.green50;
                case 'reject': return palette.red50;
                case 'delete': return palette.red50;
                case 'block': return palette.amber50;
                case 'unblock': return palette.green50;
                case 'verify': return palette.green50;
                default: return palette.slate100;
              }
            };

            return (
              <View key={log._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
                    {getIcon()}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{log.description}</Text>
                    <View style={styles.infoRow}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {new Date(log.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.adminText, { color: colors.textMuted }]}>Admin: {log.adminEmail}</Text>
                  <View style={[
                    styles.actionBadge,
                    log.action === 'approve' && { backgroundColor: palette.green50 },
                    log.action === 'reject' && { backgroundColor: palette.red50 },
                    log.action === 'delete' && { backgroundColor: palette.red50 },
                    log.action === 'block' && { backgroundColor: palette.amber50 },
                    log.action === 'unblock' && { backgroundColor: palette.green50 },
                    log.action === 'verify' && { backgroundColor: palette.green50 },
                  ]}>
                    <Text style={[
                      styles.actionText,
                      log.action === 'approve' && { color: palette.green600 },
                      log.action === 'reject' && { color: palette.bloodRed },
                      log.action === 'delete' && { color: palette.bloodRed },
                      log.action === 'block' && { color: palette.amber700 },
                      log.action === 'unblock' && { color: palette.green600 },
                      log.action === 'verify' && { color: palette.green600 },
                    ]}>{log.action.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      
      <Modal
        visible={clearModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setClearModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconContainer}>
              <Trash2 size={48} color={palette.bloodRed} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Clear Activity Log?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Are you sure you want to permanently delete all activity logs? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.textMuted }]}
                onPress={() => setClearModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: palette.bloodRed }]}
                onPress={handleClearActivityLog}
              >
                <Text style={[styles.modalBtnText, { color: palette.white }]}>Clear All</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, fontWeight: '600' },
  card: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: palette.bloodRed,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '800', fontSize: 14 },
  cardSub: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  adminText: { fontSize: 10, fontWeight: '600' },
  actionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  actionText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  activityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  clearBtn: { padding: 8, borderRadius: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
