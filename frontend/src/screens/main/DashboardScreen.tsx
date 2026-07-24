import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, Bell, Plus, Droplets, Users, ClipboardList, Hospital, Menu, User as UserIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';
import type { MainTabParamList } from '../../navigation/types';
import { useRootNavigation } from '../../navigation/useRootNavigation';
import { useAppUI } from '../../context/AppUIContext';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';

type Nav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const rootNav = useRootNavigation();
  const { openSidebar } = useAppUI();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [urgentRequests, setUrgentRequests] = useState<Record<string, unknown>[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Derived state from auth context
  const userName = user?.name?.split(' ')[0] || 'Hero';
  const userLocation = user?.location || 'Somalia';
  const userProfileImage = user?.profileImage || '';
  const userEmail = user?.email || '';
  const fullUserName = user?.name || '';

  const fetchData = useCallback(async (retryCount = 0) => {
    try {
      const [reqRes, notifRes] = await Promise.all([
        api.get('/api/requests'),
        api.get('/api/notifications/unread-count')
      ]);
      const list = Array.isArray(reqRes.data) ? reqRes.data : [];
      const top3 = list.slice(0, 3);
      setUrgentRequests(top3);
      setUnreadNotifications(Number((notifRes.data as any).count || 0));
      
      // Save to cache
      await AsyncStorage.setItem('dash_cache_requests', JSON.stringify(top3));
      await AsyncStorage.setItem('dash_cache_notifs', String((notifRes.data as any).count || 0));
    } catch (err: any) {
      if (err.response?.status === 401 && retryCount < 2) {
        setTimeout(() => fetchData(retryCount + 1), 500);
        return;
      }
      console.error('[Dash] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(0);
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    // 1. Load from cache first for instant speed
    const loadCache = async () => {
      try {
        const [cachedReqs, cachedNotifs] = await Promise.all([
          AsyncStorage.getItem('dash_cache_requests'),
          AsyncStorage.getItem('dash_cache_notifs'),
        ]);
        if (cachedReqs) {
          setUrgentRequests(JSON.parse(cachedReqs));
          setLoading(false); // Hide skeletons if we have cached data
        }
        if (cachedNotifs) setUnreadNotifications(Number(cachedNotifs));
      } catch (e) {}
      
      // 2. Then fetch fresh data
      fetchData();
    };

    loadCache();
    const interval = setInterval(fetchData, 45000); // Poll every 45s
    return () => clearInterval(interval);
  }, [fetchData]);


  const quickActions: {
    label: string;
    icon: typeof Users;
    screen: keyof MainTabParamList;
  }[] = [
    { label: t('find_donors'), icon: Users, screen: 'Requests' },
    { label: t('request_blood'), icon: Droplets, screen: 'PostRequest' },
    { label: t('blood_orders'), icon: ClipboardList, screen: 'Requests' },
    { label: t('ambulances'), icon: Hospital, screen: 'Home' },
  ];

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={palette.bloodRed}
            colors={[palette.bloodRed]}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
          <View style={styles.headerBlob} />
          <View style={styles.topRow}>
            <View style={styles.leftCluster}>
              <TouchableOpacity style={styles.iconRound} onPress={openSidebar}>
                <Menu size={24} color={colors.white} />
              </TouchableOpacity>
              <View style={styles.userCluster}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                  {userProfileImage ? (
                    <Image
                      style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.45)' }]}
                      source={{ uri: userProfileImage }}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: 'rgba(255,255,255,0.45)' }]}>
                      <UserIcon size={24} color={palette.white} />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hi} numberOfLines={1}>{t('hi')}, {userName}</Text>
                  <Text style={styles.welcome} numberOfLines={1}>{t('welcome_app')}</Text>
                </View>
              </View>
            </View>
            <View style={styles.rightCluster}>
              <TouchableOpacity style={styles.iconRoundSm} onPress={() => rootNav.navigate('Notifications')}>
                <Bell size={20} color={palette.white} />
                {unreadNotifications > 0 && <View style={styles.badge} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plusBtn}
                onPress={() => navigation.navigate('PostRequest')}
              >
                <Plus size={20} color={palette.bloodRed} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('PostRequest')}>
            <View style={styles.heroRow}>
              <View style={styles.heroTextCol}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  {`${t('donate_blood')}\n${t('save_life')}`}
                </Text>
              </View>
              <Image
                style={styles.heroImg}
                source={{
                  uri: 'https://images.unsplash.com/photo-1536856789448-4e23a067a057?q=80&w=400&auto=format&fit=crop',
                }}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.searchIconBox, { backgroundColor: colors.inputBg }]}>
                  <MapPin size={20} color={colors.textMuted} />
                </View>
                <TextInput 
                  placeholder="Search Nearby" 
                  placeholderTextColor={colors.textMuted} 
                  style={[styles.searchInput, { color: colors.text }]} 
                />
                <TouchableOpacity style={[styles.searchIconBox, { backgroundColor: colors.inputBg }]}>
                  <Search size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => navigation.navigate(action.screen)}
                    >
                      <View style={[styles.gridIcon, { backgroundColor: isDark ? palette.slate700 : palette.red50 }]}>
                        <Icon size={20} color={palette.bloodRed} />
                      </View>
                      <Text style={[styles.gridLabel, { color: colors.text }]}>{action.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Blood</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
              <Text style={[styles.seeAll, { color: palette.bloodRed }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Skeleton width={58} height={58} borderRadius={16} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="70%" height={16} />
                    <Skeleton width="40%" height={12} />
                  </View>
                  <Skeleton width={70} height={32} borderRadius={999} />
                </View>
              ))}
            </View>
          ) : urgentRequests.length ? (
            urgentRequests.map((req) => {
              const id = String(req._id ?? req.id ?? Math.random());
              const name = String(req.name ?? '');
              const type = String(req.type ?? '');
              const location = String(req.location ?? '');
              return (
                <View key={id} style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.reqType, { backgroundColor: isDark ? palette.slate700 : palette.red50 }]}>
                    <Text style={[styles.reqTypeText, { color: palette.bloodRed }]}>{type}</Text>
                  </View>
                  <View style={styles.reqMid}>
                    <Text style={[styles.reqName, { color: colors.text }]}>{name}</Text>
                    <View style={styles.reqLocRow}>
                      <MapPin size={12} color={colors.textMuted} />
                      <Text style={[styles.reqLoc, { color: colors.textMuted }]}>{location}</Text>
                    </View>
                  </View>
                  {req.creatorEmail !== userEmail && req.name !== fullUserName && (
                    <TouchableOpacity
                      style={[
                        styles.donatePill, 
                        { backgroundColor: (req.donors as string[] || []).includes(userEmail) ? palette.green600 : palette.bloodRed }
                      ]}
                      onPress={() => rootNav.navigate('DonateAction', { requestData: req })}
                      disabled={(req.donors as string[] || []).includes(userEmail)}
                    >
                      <Text style={[styles.donatePillText, { color: palette.white }]}>
                        {(req.donors as string[] || []).includes(userEmail) ? 'Donated' : 'Donate'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No urgent requests found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: {
    paddingTop: 0,
    paddingBottom: 72,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    zIndex: 1,
  },
  leftCluster: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  iconRound: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCluster: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    maxWidth: '65%', // Limit name width to protect right-side icons
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hi: { fontWeight: '800', fontSize: 17, color: palette.white },
  welcome: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.bloodRed,
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  rightCluster: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    flexShrink: 0,
  },
  iconRoundSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTextCol: { maxWidth: '50%' },
  heroTitle: { fontSize: 22, fontWeight: '900', lineHeight: 28 },
  heroImg: { width: 104, height: 104, borderRadius: 16, transform: [{ rotate: '3deg' }] },
  body: { marginTop: -28, paddingHorizontal: 22, zIndex: 2, gap: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    gap: 8,
  },
  searchIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: { fontWeight: '800', fontSize: 13, flex: 1 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  seeAll: { fontWeight: '800', fontSize: 13 },
  loader: { paddingVertical: 24 },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
  },
  reqType: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqTypeText: { fontWeight: '900', fontSize: 18 },
  reqMid: { flex: 1 },
  reqName: { fontWeight: '800' },
  reqLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reqLoc: { fontSize: 12 },
  donatePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  donatePillText: { fontSize: 11, fontWeight: '900' },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: { fontWeight: '600' },
});
