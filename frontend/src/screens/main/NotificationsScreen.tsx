import React, { useState, useEffect } from 'react';
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
import { Bell, ChevronLeft, CheckCircle2, Info, Droplets, MessageSquare, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';

type AppNotification = {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'request' | 'message';
  read: boolean;
  metadata?: {
    donorEmail?: string;
    donorName?: string;
  };
  createdAt: string;
};

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/api/notifications');
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'request': return <Droplets size={20} color={palette.bloodRed} />;
      case 'message': return <MessageSquare size={20} color={palette.blue600} />;
      default: return <Info size={20} color={colors.textMuted} />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('notifications')}</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[styles.markRead, { color: palette.bloodRed }]}>{t('clear_all')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={palette.bloodRed} style={styles.loader} size="large" />
        ) : notifications.length > 0 ? (
          notifications.map((item) => (
            <TouchableOpacity 
              key={item._id} 
              activeOpacity={0.7}
              onPress={() => {
                if (!item.read) {
                  api.put(`/api/notifications/${item._id}/read`).catch(() => {});
                  setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, read: true } : n));
                }
                if (item.metadata?.donorEmail && item.metadata?.donorName) {
                  navigation.navigate('Chat', {
                    recipientEmail: item.metadata.donorEmail,
                    recipientName: item.metadata.donorName
                  });
                }
              }}
              style={[
                styles.notifCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                !item.read && { backgroundColor: isDark ? 'rgba(211, 47, 47, 0.05)' : palette.red50, borderColor: isDark ? palette.bloodRed : palette.red100 }
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.inputBg }]}>
                {getIcon(item.type)}
              </View>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
                  {!item.read && <View style={[styles.unreadDot, { backgroundColor: palette.bloodRed }]} />}
                </View>
                <Text style={[styles.notifMsg, { color: colors.textMuted }]}>{item.message}</Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>{getTimeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
              <Bell size={48} color={colors.border} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>{t('no_notifications')}</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>{t('notifications_desc')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginLeft: -8 },
  title: { fontSize: 22, fontWeight: '900' },
  markRead: { fontWeight: '800', fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 40 },
  notifCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontWeight: '800', fontSize: 16 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMsg: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 8 },
  time: { fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', fontWeight: '600', lineHeight: 20 },
});
