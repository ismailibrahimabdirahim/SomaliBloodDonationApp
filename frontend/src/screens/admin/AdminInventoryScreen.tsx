import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, Search, CheckCircle, XCircle, Menu, Droplets, MapPin, Heart, Trash2 } from 'lucide-react-native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAlert } from '../../context/AlertContext';

type DonationItem = {
  _id: string;
  donorEmail: string;
  bloodType: string;
  location: string;
  status: string;
  createdAt: string;
};

type RequestItem = {
  _id: string;
  name: string;
  type: string;
  location: string;
  urgency: string;
  status: string;
  creatorEmail: string;
  patientName: string;
  hospitalName: string;
  donors: string[];
  createdAt: string;
};

export default function AdminInventoryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSidebar } = useAppUI();
  const { showAlert } = useAlert();
  
  const [activeTab, setActiveTab] = useState<'donations' | 'requests'>('donations');
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [donationsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/inventory'),
        api.get('/api/admin/requests')
      ]);
      setDonations(donationsRes.data);
      setRequests(requestsRes.data);
    } catch (err: any) {
      console.error('[AdminInventory] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleApproveDonation = async (id: string) => {
    try {
      await api.put(`/api/admin/inventory/${id}`, { status: 'approved' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleRejectDonation = async (id: string) => {
    try {
      await api.put(`/api/admin/inventory/${id}`, { status: 'declined' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      await api.put(`/api/admin/requests/${id}/approve`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await api.put(`/api/admin/requests/${id}/reject`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleClearProcessedDonations = async () => {
    try {
      const processedCount = donations.filter(d => d.status === 'approved' || d.status === 'declined').length;
      if (processedCount === 0) {
        showAlert({ type: 'info', title: 'Nothing to Clear', message: 'No processed donations to clear.' });
        return;
      }
      
      await api.delete('/api/admin/inventory/clear-processed');
      fetchData();
      showAlert({ type: 'success', title: 'Cleared', message: `${processedCount} processed donations removed.` });
    } catch (err) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to clear donations.' });
    }
  };

  const filteredDonations = donations.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.donorEmail.toLowerCase().includes(query) || 
             item.bloodType.toLowerCase().includes(query) ||
             item.location.toLowerCase().includes(query);
    }
    return true;
  });

  const filteredRequests = requests.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query) || 
             item.type.toLowerCase().includes(query) ||
             item.location.toLowerCase().includes(query) ||
             item.creatorEmail.toLowerCase().includes(query);
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
            <Package size={22} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Inventory</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'donations' && styles.activeTab, { borderColor: activeTab === 'donations' ? palette.bloodRed : 'transparent' }]}
          onPress={() => setActiveTab('donations')}
        >
          <Heart size={18} color={activeTab === 'donations' ? palette.bloodRed : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'donations' ? palette.bloodRed : colors.textMuted }]}>
            Voluntary Donations ({donations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab, { borderColor: activeTab === 'requests' ? palette.bloodRed : 'transparent' }]}
          onPress={() => setActiveTab('requests')}
        >
          <Droplets size={18} color={activeTab === 'requests' ? palette.bloodRed : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? palette.bloodRed : colors.textMuted }]}>
            Blood Requests ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search ${activeTab === 'donations' ? 'donations' : 'requests'}...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {activeTab === 'donations' && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: palette.bloodRed }]}
              onPress={handleClearProcessedDonations}
            >
              <Trash2 size={16} color={palette.white} />
              <Text style={styles.clearBtnText}>Clear Processed</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeTab === 'donations' ? (
          <>
            {filteredDonations.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No donations found.</Text>
            ) : (
              filteredDonations.map(item => (
                <View key={item._id} style={[styles.card, { backgroundColor: colors.card }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.bloodBadge, { backgroundColor: palette.bloodRed }]}>
                        <Text style={styles.bloodBadgeText}>{item.bloodType}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.donorEmail}</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>{item.location}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: item.status === 'approved' ? palette.green50 : item.status === 'declined' ? palette.red50 : palette.amber50 }
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        { color: item.status === 'approved' ? palette.green600 : item.status === 'declined' ? palette.bloodRed : palette.amber700 }
                      ]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardBody}>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {item.status === 'pending' && (
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: palette.green500 }]}
                        onPress={() => handleApproveDonation(item._id)}
                      >
                        <CheckCircle size={16} color={palette.white} />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: palette.bloodRed }]}
                        onPress={() => handleRejectDonation(item._id)}
                      >
                        <XCircle size={16} color={palette.white} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {filteredRequests.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No requests found.</Text>
            ) : (
              filteredRequests.map(item => (
                <View key={item._id} style={[styles.card, { backgroundColor: colors.card }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.bloodBadge, { backgroundColor: palette.bloodRed }]}>
                        <Droplets size={18} color={palette.white} />
                        <Text style={styles.bloodBadgeText}>{item.type}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.patientName}</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>{item.hospitalName}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: item.status === 'approved' ? palette.green50 : item.status === 'declined' ? palette.red50 : palette.amber50 }
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        { color: item.status === 'approved' ? palette.green600 : item.status === 'declined' ? palette.bloodRed : palette.amber700 }
                      ]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardBody}>
                    <View style={styles.cardMeta}>
                      <MapPin size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.location}</Text>
                    </View>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      Requested by: {item.creatorEmail}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      Urgency: {item.urgency}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                      Donors: {item.donors?.length || 0}
                    </Text>
                  </View>

                  {item.status === 'pending' && (
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: palette.green500 }]}
                        onPress={() => handleApproveRequest(item._id)}
                      >
                        <CheckCircle size={16} color={palette.white} />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: palette.bloodRed }]}
                        onPress={() => handleRejectRequest(item._id)}
                      >
                        <XCircle size={16} color={palette.white} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  activeTab: {
    backgroundColor: palette.red50,
  },
  tabText: { fontWeight: '800', fontSize: 12 },
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
  cardBody: { marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontWeight: '700', fontSize: 13 },
  cardTitle: { fontWeight: '800', fontSize: 14 },
  cardSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  dateText: { fontSize: 11, fontWeight: '600' },
  bloodBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.bloodRed,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bloodBadgeText: { fontWeight: '900', fontSize: 14, color: palette.white },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
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
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: { color: palette.white, fontWeight: '800', fontSize: 11 },
});
