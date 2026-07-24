import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Search, Ban, Trash2, Shield, Mail, Menu } from 'lucide-react-native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';

type UserItem = {
  _id: string;
  name: string;
  email: string;
  bloodType?: string;
  isAdmin?: boolean;
  profileImage?: string;
  isBlocked?: boolean;
  isVerified?: boolean;
  donations?: number;
};

export default function AdminUsersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSidebar } = useAppUI();
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const usersRes = await api.get('/api/admin/users');
      setUsers(usersRes.data);
    } catch (err: any) {
      console.error('[AdminUsers] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDeleteUser = (id: string, name: string) => {
    setUserToDelete({ id, name });
    setDeleteModalVisible(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/admin/users/${userToDelete.id}`);
      setUsers(prev => prev.filter(u => u._id !== userToDelete.id));
      fetchData();
      setDeleteModalVisible(false);
      setUserToDelete(null);
    } catch (err) { console.error(err); }
  };

  const handleBlockUser = async (id: string, name: string, isBlocked: boolean) => {
    try {
      const endpoint = isBlocked ? `/api/admin/users/${id}/unblock` : `/api/admin/users/${id}/block`;
      await api.put(endpoint);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !isBlocked } : u));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const filteredUsers = users.filter(u => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    }
    return true;
  });

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
            <Users size={22} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Manage Users</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Users ({users.length})</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredUsers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users found.</Text>
        ) : (
          filteredUsers.map(u => (
            <View key={u._id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Image
                    style={styles.userAvatar}
                    source={{ uri: u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff` }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{u.name}</Text>
                      {u.isAdmin && (
                        <View style={[styles.adminTag, { backgroundColor: palette.bloodRed }]}>
                          <Shield size={10} color={palette.white} />
                          <Text style={styles.adminTagText}>ADMIN</Text>
                        </View>
                      )}
                      {u.isBlocked && (
                        <View style={[styles.blockedTag, { backgroundColor: palette.amber700 }]}>
                          <Ban size={10} color={palette.white} />
                          <Text style={styles.blockedTagText}>BLOCKED</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.infoRow}>
                      <Mail size={12} color={colors.textMuted} />
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>{u.email}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                {u.bloodType && (
                  <View style={styles.bloodTypeBadge}>
                    <Text style={[styles.bloodTypeText, { color: palette.bloodRed }]}>{u.bloodType}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                {!u.isAdmin && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: u.isBlocked ? palette.green500 : palette.amber700 }]}
                      onPress={() => handleBlockUser(u._id, u.name, u.isBlocked || false)}
                    >
                      <Ban size={16} color={palette.white} />
                      <Text style={styles.actionBtnText}>{u.isBlocked ? 'Unblock' : 'Block'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : palette.red50 }]}
                      onPress={() => handleDeleteUser(u._id, u.name)}
                    >
                      <Trash2 size={18} color={palette.bloodRed} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconContainer}>
              <Trash2 size={48} color={palette.bloodRed} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete User?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Are you sure you want to permanently delete {userToDelete?.name}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.textMuted }]}
                onPress={() => { setDeleteModalVisible(false); setUserToDelete(null); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: palette.bloodRed }]}
                onPress={confirmDeleteUser}
              >
                <Text style={[styles.modalBtnText, { color: palette.white }]}>Delete</Text>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardBody: { marginBottom: 8 },
  bloodTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.red50,
    alignSelf: 'flex-start',
    shadowColor: palette.bloodRed,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  bloodTypeText: { fontSize: 11, fontWeight: '800' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardTitle: { fontWeight: '800', fontSize: 14 },
  cardSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  cardMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  userAvatar: { width: 40, height: 40, borderRadius: 12 },
  adminTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, shadowColor: palette.bloodRed, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  adminTagText: { color: palette.white, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  blockedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, shadowColor: palette.amber700, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  blockedTagText: { color: palette.white, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  userActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 8 },
  actionRow: { flexDirection: 'row', gap: 6, flex: 1 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { color: palette.white, fontWeight: '800', fontSize: 11 },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
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
