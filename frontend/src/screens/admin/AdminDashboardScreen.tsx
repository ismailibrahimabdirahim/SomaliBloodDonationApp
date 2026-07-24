import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Droplets, ShieldCheck, Package, Clock, CheckCircle, XCircle, Menu, TrendingUp, Activity as ActivityIcon, Bell, User as UserIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppUI } from '../../context/AppUIContext';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openSidebar } = useAppUI();
  
  // Admin check - redirect if not admin
  useEffect(() => {
    if (!user?.isAdmin) {
      navigation.goBack();
    }
  }, [user?.isAdmin, navigation]);

  // Admin profile data
  const adminName = user?.name?.split(' ')[0] || 'Admin';
  const adminEmail = user?.email || '';
  const adminProfileImage = user?.profileImage || '';
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, notifRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/notifications/unread-count')
      ]);
      setStats(statsRes.data);
      setUnreadNotifications(Number((notifRes.data as any).count || 0));
    } catch (err: any) {
      console.error('[Admin] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

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
        <View style={styles.topRow}>
          <View style={styles.leftCluster}>
            <TouchableOpacity style={styles.iconRound} onPress={openSidebar}>
              <Menu size={24} color={palette.white} />
            </TouchableOpacity>
            <View style={styles.userCluster}>
              <TouchableOpacity>
                {adminProfileImage ? (
                  <Image
                    style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.45)' }]}
                    source={{ uri: adminProfileImage }}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: 'rgba(255,255,255,0.45)' }]}>
                    <UserIcon size={24} color={palette.white} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.hi} numberOfLines={1}>Hi, {adminName}</Text>
                <Text style={styles.welcome} numberOfLines={1}>Admin Dashboard</Text>
              </View>
            </View>
          </View>
          <View style={styles.rightCluster}>
            <TouchableOpacity style={styles.iconRoundSm} onPress={() => navigation.navigate('Notifications' as never)}>
              <Bell size={20} color={palette.white} />
              {unreadNotifications > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dashboard Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}>
              <Users size={28} color={palette.bloodRed} />
            </View>
            <Text style={[styles.statNum, { color: palette.bloodRed }]}>{stats.totalUsers}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Users</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.green50 }]}>
              <TrendingUp size={12} color={palette.green600} />
              <Text style={[styles.trendText, { color: palette.green600 }]}>+12%</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}>
              <Droplets size={28} color={palette.bloodRed} />
            </View>
            <Text style={[styles.statNum, { color: palette.bloodRed }]}>{stats.totalDonors}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Donors</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.green50 }]}>
              <TrendingUp size={12} color={palette.green600} />
              <Text style={[styles.trendText, { color: palette.green600 }]}>+8%</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}>
              <Package size={28} color={palette.bloodRed} />
            </View>
            <Text style={[styles.statNum, { color: palette.bloodRed }]}>{stats.totalRequests}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Requests</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.green50 }]}>
              <TrendingUp size={12} color={palette.green600} />
              <Text style={[styles.trendText, { color: palette.green600 }]}>+15%</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : palette.amber50 }]}>
              <Clock size={28} color={palette.amber700} />
            </View>
            <Text style={[styles.statNum, { color: palette.amber700 }]}>{stats.pendingRequests}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pending</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.amber50 }]}>
              <ActivityIcon size={12} color={palette.amber700} />
              <Text style={[styles.trendText, { color: palette.amber700 }]}>Active</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : palette.green50 }]}>
              <CheckCircle size={28} color={palette.green600} />
            </View>
            <Text style={[styles.statNum, { color: palette.green600 }]}>{stats.approvedRequests}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Approved</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.green50 }]}>
              <CheckCircle size={12} color={palette.green600} />
              <Text style={[styles.trendText, { color: palette.green600 }]}>Done</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(211,47,47,0.15)' : palette.red50 }]}>
              <XCircle size={28} color={palette.bloodRed} />
            </View>
            <Text style={[styles.statNum, { color: palette.bloodRed }]}>{stats.rejectedRequests}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rejected</Text>
            <View style={[styles.trendBadge, { backgroundColor: palette.red50 }]}>
              <XCircle size={12} color={palette.bloodRed} />
              <Text style={[styles.trendText, { color: palette.bloodRed }]}>-2%</Text>
            </View>
          </View>
        </View>
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
  profileBtn: { padding: 8, borderRadius: 12 },
  profileImage: { width: 40, height: 40, borderRadius: 20 },
  profileSection: { marginTop: 16, marginBottom: 8 },
  greeting: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  userName: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  userEmail: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  leftCluster: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  userCluster: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  hi: { fontSize: 16, fontWeight: '700', color: palette.white },
  welcome: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconRoundSm: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  badge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: palette.bloodRed },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  statCard: {
    width: '48%',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: palette.bloodRed,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: palette.bloodRed,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statNum: { fontSize: 32, fontWeight: '900', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  trendText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20 },
});
