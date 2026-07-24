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
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Droplets, CheckCircle, XCircle, Trash2, Search, Filter, Clock, AlertTriangle, Menu, FileImage, X, Eye } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

type RequestItem = {
  _id: string;
  name: string;
  type: string;
  location: string;
  urgency: string;
  creatorEmail: string;
  status?: string;
  phone?: string;
  description?: string;
  proofImage?: string;
  patientName?: string;
  hospitalName?: string;
  contactEmail?: string;
};

type RequestFilter = 'all' | 'pending' | 'approved' | 'declined';

export default function AdminRequestsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openSidebar } = useAppUI();
  
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<{ id: string; name: string } | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const requestsRes = await api.get('/api/admin/requests');
      setRequests(requestsRes.data);
    } catch (err: any) {
      console.error('[AdminRequests] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDeleteRequest = (id: string, name: string) => {
    setRequestToDelete({ id, name });
    setDeleteModalVisible(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    try {
      await api.delete(`/api/admin/requests/${requestToDelete.id}`);
      setRequests(prev => prev.filter(r => r._id !== requestToDelete.id));
      fetchData();
      setDeleteModalVisible(false);
      setRequestToDelete(null);
    } catch (err) { console.error(err); }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      await api.put(`/api/admin/requests/${id}/approve`);
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'approved' } : r));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await api.put(`/api/admin/requests/${id}/reject`);
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'declined' } : r));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(query) || 
             r.location.toLowerCase().includes(query) ||
             r.type.toLowerCase().includes(query);
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
            <Droplets size={22} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Manage Requests</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Blood Requests</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search requests..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterRow}>
          {(['all', 'pending', 'approved', 'declined'] as RequestFilter[]).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterBtn, { backgroundColor: requestFilter === filter ? palette.bloodRed : colors.card }]}
              onPress={() => setRequestFilter(filter)}
            >
              <Text style={[styles.filterText, { color: requestFilter === filter ? palette.white : colors.textMuted }]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredRequests.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No requests found.</Text>
        ) : (
          filteredRequests.map(r => (
            <View key={r._id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[
                    styles.urgencyIndicator,
                    r.urgency === 'Emergency' && { backgroundColor: palette.bloodRed },
                    r.urgency === 'Urgent' && { backgroundColor: palette.amber700 },
                    r.urgency === 'Normal' && { backgroundColor: palette.green600 },
                  ]}>
                    {r.urgency === 'Emergency' ? <AlertTriangle size={16} color={palette.white} /> : <Clock size={16} color={palette.white} />}
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{r.name}</Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>{r.type} • {r.location}</Text>
                  </View>
                </View>
                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity 
                    style={[styles.viewBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : palette.blue50 }]}
                    onPress={() => {
                      console.log('View button pressed for request:', r._id);
                      setSelectedRequest(r);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Eye size={16} color={palette.blue600} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : palette.red50 }]}
                    onPress={() => handleDeleteRequest(r._id, r.name)}
                  >
                    <Trash2 size={18} color={palette.bloodRed} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Urgency:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{r.urgency}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {r.status === 'pending' ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: palette.green500, flex: 1 }]}
                      onPress={() => handleApproveRequest(r._id)}
                    >
                      <CheckCircle size={18} color={palette.white} />
                      <Text style={styles.actionBtnText}>Approve Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: palette.bloodRed, flex: 1 }]}
                      onPress={() => handleRejectRequest(r._id)}
                    >
                      <XCircle size={18} color={palette.white} />
                      <Text style={styles.actionBtnText}>Reject Request</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[
                    styles.statusBadge,
                    r.status === 'approved' && { backgroundColor: palette.green50 },
                    r.status === 'declined' && { backgroundColor: palette.red50 },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      r.status === 'approved' && { color: palette.green600 },
                      r.status === 'declined' && { color: palette.bloodRed },
                    ]}>{(r.status || 'pending').toUpperCase()}</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Request?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Are you sure you want to permanently delete this request from {requestToDelete?.name}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.textMuted }]}
                onPress={() => { setDeleteModalVisible(false); setRequestToDelete(null); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: palette.bloodRed }]}
                onPress={confirmDeleteRequest}
              >
                <Text style={[styles.modalBtnText, { color: palette.white }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log('Closing image modal');
          setImageModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.imageModalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.imageCloseBtn}
              onPress={() => {
                console.log('Closing image modal via close button');
                setImageModalVisible(false);
              }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.imageModalTitle, { color: colors.text }]}>Medical Proof</Text>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageModalImage}
                resizeMode="contain"
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <Text style={[styles.detailValue, { color: colors.textMuted }]}>No image available</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log('Closing detail modal');
          setDetailModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.imageCloseBtn}
              onPress={() => {
                console.log('Closing detail modal via close button');
                setDetailModalVisible(false);
              }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.imageModalTitle, { color: colors.text }]}>Request Details</Text>
            {selectedRequest && (
              <ScrollView style={styles.detailScroll}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Requester Name</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.name}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Blood Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.type}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.location}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Urgency</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.urgency}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Contact</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.contactEmail || selectedRequest.phone}</Text>
                </View>
                {selectedRequest.patientName && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Patient Name</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.patientName}</Text>
                  </View>
                )}
                {selectedRequest.hospitalName && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Hospital Name</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.hospitalName}</Text>
                  </View>
                )}
                {selectedRequest.description && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Description</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRequest.description}</Text>
                  </View>
                )}
                {selectedRequest.proofImage && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Medical Proof</Text>
                    <TouchableOpacity
                      style={[styles.proofBtn, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}
                      onPress={() => {
                        const proofImage = selectedRequest.proofImage || '';
                        console.log('Medical proof image URL:', proofImage);
                        const imageUrl = proofImage.startsWith('data:') 
                          ? proofImage 
                          : proofImage;
                        setSelectedImage(imageUrl || null);
                        setDetailModalVisible(false);
                        setTimeout(() => setImageModalVisible(true), 100);
                      }}
                    >
                      <FileImage size={16} color={palette.bloodRed} />
                      <Text style={[styles.proofBtnText, { color: palette.bloodRed }]}>View Medical Proof</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgencyIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    padding: 8,
    borderRadius: 10,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { fontSize: 11, fontWeight: '600', width: 70 },
  infoValue: { fontSize: 12, fontWeight: '700', flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '800', fontSize: 14 },
  cardSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  cardMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  urgencyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  urgencyText: { fontSize: 9, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: palette.white, fontWeight: '800', fontSize: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterText: { fontSize: 11, fontWeight: '800' },
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
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  proofBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  imageModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  imageCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    marginTop: 8,
  },
  imageModalImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  detailModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  detailScroll: {
    width: '100%',
    marginTop: 16,
  },
  detailSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
