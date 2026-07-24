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
import { Package, Search, Award, Menu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

type UserItem = {
  _id: string;
  name: string;
  email: string;
  bloodType?: string;
  isAdmin?: boolean;
  profileImage?: string;
  isVerified?: boolean;
  donations?: number;
};

export default function AdminDonorsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openSidebar } = useAppUI();
  
  const [donors, setDonors] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const donorsRes = await api.get('/api/admin/donors');
      setDonors(donorsRes.data);
    } catch (err: any) {
      console.error('[AdminDonors] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredDonors = donors.filter(d => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query);
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
            <Text style={[styles.headerTitle, { color: palette.white }]}>Manage Donors</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Donors ({donors.length})</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search donors..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredDonors.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No donors found.</Text>
        ) : (
          filteredDonors.map(d => (
            <View key={d._id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.bloodBadge, { backgroundColor: palette.bloodRed }]}>
                    <Text style={styles.bloodBadgeText}>{d.bloodType}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{d.name}</Text>
                    <Text style={[styles.cardSub, { color: colors.textMuted }]}>{d.email}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.donationBadge}>
                  <Award size={16} color={palette.amber700} />
                  <Text style={[styles.donationText, { color: palette.amber700 }]}>
                    {d.donations || 0} Donation{d.donations !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))
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
  donationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.amber50,
    alignSelf: 'flex-start',
    shadowColor: palette.amber700,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  donationText: { fontSize: 11, fontWeight: '800' },
  cardTitle: { fontWeight: '800', fontSize: 14 },
  cardSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
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
});
