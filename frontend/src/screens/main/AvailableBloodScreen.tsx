import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Droplets, MapPin, ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { BLOOD_TYPES } from '../../config';
import type { RootStackParamList } from '../../navigation/types';

type InventoryItem = {
  _id: string;
  donorEmail: string;
  bloodType: string;
  location: string;
  status: string;
  createdAt: string;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AvailableBloodScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory/available');
      setInventory(res.data);
    } catch (err: any) {
      console.error('[Inventory] Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const onRefresh = () => { setRefreshing(true); fetchInventory(); };

  const handleScroll = (event: any) => {
    const scrollWidth = event.nativeEvent.layoutMeasurement.width;
    const contentWidth = event.nativeEvent.contentSize.width;
    const offsetX = event.nativeEvent.contentOffset.x;

    setShowLeftArrow(offsetX > 10);
    setShowRightArrow(offsetX < contentWidth - scrollWidth - 10);
  };

  const scrollLeft = () => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  };

  const scrollRight = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const filtered = filterType
    ? inventory.filter(i => i.bloodType === filterType)
    : inventory;

  // Group by blood type for summary
  const summary: Record<string, number> = {};
  inventory.forEach(i => {
    summary[i.bloodType] = (summary[i.bloodType] || 0) + 1;
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
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={palette.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Activity size={22} color={palette.white} />
            <Text style={[styles.headerTitle, { color: palette.white }]}>Available Blood</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Blood Type Summary */}
      <View style={styles.summaryContainer}>
        {showLeftArrow && (
          <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: colors.card }]} onPress={scrollLeft}>
            <ChevronLeft size={20} color={palette.bloodRed} />
          </TouchableOpacity>
        )}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryRow}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <TouchableOpacity
            style={[styles.summaryChip, { backgroundColor: !filterType ? palette.bloodRed : colors.card }]}
            onPress={() => setFilterType('')}
          >
            <Text style={[styles.summaryChipText, { color: !filterType ? palette.white : colors.text }]}>All ({inventory.length})</Text>
          </TouchableOpacity>
          {BLOOD_TYPES.map(type => {
            const count = summary[type] || 0;
            const active = filterType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.summaryChip, { backgroundColor: active ? palette.bloodRed : colors.card }]}
                onPress={() => setFilterType(active ? '' : type)}
              >
                <Text style={[styles.summaryChipText, { color: active ? palette.white : colors.text }]}>{type} ({count})</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {showRightArrow && (
          <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: colors.card }]} onPress={scrollRight}>
            <ChevronRight size={20} color={palette.bloodRed} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Droplets size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Available Blood</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {filterType
                ? `No approved ${filterType} blood available yet.`
                : 'No approved donations available yet. Check back later!'}
            </Text>
          </View>
        ) : (
          filtered.map(item => {
            const isOwnDonation = item.donorEmail === user?.email;
            return (
              <View key={item._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.bloodBadge, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}>
                    <Droplets size={18} color={palette.bloodRed} />
                    <Text style={[styles.bloodText, { color: palette.bloodRed }]}>{item.bloodType}</Text>
                  </View>
                  <View style={[styles.availableBadge, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : palette.green50 }]}>
                    <Text style={[styles.availableText, { color: palette.green600 }]}>AVAILABLE</Text>
                  </View>
                </View>
                <View style={styles.cardMeta}>
                  <MapPin size={14} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.location}</Text>
                </View>
                <Text style={[styles.donorText, { color: colors.textMuted }]}>
                  Donor: {item.donorEmail}
                </Text>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {!isOwnDonation && (
                  <TouchableOpacity
                    style={[styles.chatBtn, { backgroundColor: palette.bloodRed }]}
                    onPress={() => navigation.navigate('Chat', { recipientName: item.donorEmail.split('@')[0], recipientEmail: item.donorEmail })}
                  >
                    <MessageCircle size={16} color={palette.white} />
                    <Text style={styles.chatBtnText}>Contact Donor</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
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
  summaryContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 14 },
  summaryRow: { paddingHorizontal: 8, paddingVertical: 14, gap: 8 },
  arrowBtn: {
    padding: 8,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 4,
  },
  summaryChipText: { fontWeight: '800', fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 16 },
  emptySub: { textAlign: 'center', marginTop: 8, fontWeight: '600', paddingHorizontal: 40 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bloodText: { fontWeight: '900', fontSize: 16 },
  availableBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  availableText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontWeight: '700', fontSize: 13 },
  donorText: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dateText: { fontSize: 11, fontWeight: '600' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  chatBtnText: { fontWeight: '800', fontSize: 14, color: palette.white },
});
