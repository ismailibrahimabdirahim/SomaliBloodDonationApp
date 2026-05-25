import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { ArrowLeft, Droplets, MapPin, Phone, Heart, ShieldCheck, Palette, Check, X, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useAlert } from '../../context/AlertContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;

const { width } = Dimensions.get('window');

export const CHAT_THEMES = [
  { id: 'default',     bg: null,        bubbleColor: null,     label: 'Default',    preview: '#E8F5E9' },
  { id: 'ocean',       bg: '#0D1B2A',   bubbleColor: '#1565C0', label: 'Ocean',      preview: '#0D1B2A' },
  { id: 'sunset',      bg: '#FFF3E0',   bubbleColor: '#E64A19', label: 'Sunset',     preview: '#FFF3E0' },
  { id: 'forest',      bg: '#1B2A1B',   bubbleColor: '#2E7D32', label: 'Forest',     preview: '#1B2A1B' },
  { id: 'lavender',    bg: '#F3E5F5',   bubbleColor: '#7B1FA2', label: 'Lavender',   preview: '#F3E5F5' },
  { id: 'rose',        bg: '#FCE4EC',   bubbleColor: '#C62828', label: 'Rose',       preview: '#FCE4EC' },
  { id: 'midnight',    bg: '#121212',   bubbleColor: '#37474F', label: 'Midnight',   preview: '#121212' },
  { id: 'sand',        bg: '#FFF8E1',   bubbleColor: '#F9A825', label: 'Sand',       preview: '#FFF8E1' },
];

export default function PublicProfileScreen({ route, navigation }: Props) {
  const { email, name: initialName } = route.params;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(initialName ? { name: initialName, email } : null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');

  const themeKey = `chat_theme_${email}`;
  const profileKey = `profile_cache_${email}`;

  useEffect(() => {
    const loadProfile = async () => {
      // 1. Load from cache immediately
      const [cachedProfile, savedTheme] = await Promise.all([
        AsyncStorage.getItem(profileKey),
        AsyncStorage.getItem(themeKey),
      ]);

      if (cachedProfile) setProfileData(JSON.parse(cachedProfile));
      if (savedTheme) setSelectedTheme(savedTheme);

      // 2. Fetch fresh data in background
      try {
        const { data } = await api.get(`/api/auth/profile/${encodeURIComponent(email)}`);
        setProfileData(data);
        await AsyncStorage.setItem(profileKey, JSON.stringify(data));
      } catch (err) {
        console.error("Profile refresh failed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [email]);

  const handleCall = () => {
    const phone = profileData?.phone;
    if (!phone) {
      Alert.alert('No Phone', 'This user has not provided a phone number.');
      return;
    }
    const url = `tel:${phone.replace(/\s+/g, '')}`;
    Linking.canOpenURL(url).then(ok => {
      if (ok) Linking.openURL(url);
      else Alert.alert('Cannot Call', 'Your device does not support phone calls.');
    });
  };

  const applyTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    await AsyncStorage.setItem(themeKey, themeId);
  };

  if (!profileData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={palette.bloodRed} />
      </View>
    );
  }

  const currentTheme = CHAT_THEMES.find(t => t.id === selectedTheme) || CHAT_THEMES[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.9}>
            {profileData.profileImage ? (
              <Image source={{ uri: profileData.profileImage }} style={styles.avatar} />
            ) : (
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=random&size=200` }} style={styles.avatar} />
            )}
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>{profileData.name}</Text>
          <Text style={[styles.emailText, { color: colors.textMuted }]}>{profileData.email}</Text>

          {/* Availability Badge */}
          <View style={[styles.availBadge, { backgroundColor: profileData.isAvailable ? '#E8F5E9' : '#FFEBEE' }]}>
            <View style={[styles.availDot, { backgroundColor: profileData.isAvailable ? '#4CAF50' : '#F44336' }]} />
            <Text style={[styles.availText, { color: profileData.isAvailable ? '#2E7D32' : '#C62828' }]}>
              {profileData.isAvailable ? 'Available to Donate' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} onPress={handleCall} activeOpacity={0.7}>
            <Phone size={24} color={palette.bloodRed} />
            <Text style={[styles.actionText, { color: palette.bloodRed }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Chat', { recipientName: profileData.name, recipientEmail: profileData.email })}
          >
            <MessageCircle size={24} color={palette.bloodRed} />
            <Text style={[styles.actionText, { color: palette.bloodRed }]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7} onPress={() => setShowThemePicker(true)}>
            <Palette size={24} color={palette.bloodRed} />
            <Text style={[styles.actionText, { color: palette.bloodRed }]}>Theme</Text>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Droplets size={22} color={palette.bloodRed} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Blood Type</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.bloodType || 'Not specified'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Heart size={22} color={palette.bloodRed} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Total Donations</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.donations || 0} times</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Phone size={22} color={palette.bloodRed} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone Number</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.phone || 'Not provided'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <MapPin size={22} color={palette.bloodRed} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.location || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        {/* Current Chat Theme Preview */}
        <TouchableOpacity
          style={[styles.themePreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowThemePicker(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.themePreviewDot, { backgroundColor: currentTheme.preview }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Chat Theme</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{currentTheme.label}</Text>
          </View>
          <Palette size={20} color={palette.bloodRed} />
        </TouchableOpacity>
      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} animationType="slide" transparent onRequestClose={() => setShowThemePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chat Theme</Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>The chat background and colors will change.</Text>

            <FlatList
              data={CHAT_THEMES}
              keyExtractor={i => i.id}
              numColumns={4}
              contentContainerStyle={styles.themeGrid}
              renderItem={({ item }) => {
                const isSelected = selectedTheme === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.themeCell, isSelected && styles.themeCellSelected]}
                    onPress={() => applyTheme(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.themeCard, { backgroundColor: item.preview }]}>
                      {/* Mini bubble previews */}
                      <View style={[styles.miniMsgLeft, { backgroundColor: item.bubbleColor || '#E0E0E0' }]} />
                      <View style={[styles.miniMsgRight, { backgroundColor: item.bubbleColor || palette.bloodRed }]} />
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={12} color="white" />
                      </View>
                    )}
                    <Text style={[styles.themeLabel, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -10 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 30 },
  avatar: {
    width: 140, height: 140, borderRadius: 70, marginBottom: 16,
    borderWidth: 4, borderColor: 'rgba(211,47,47,0.3)',
  },
  name: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  emailText: { fontSize: 15, fontWeight: '500', marginBottom: 12 },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 13, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 17, fontWeight: '700' },
  divider: { height: 1, marginLeft: 56 },
  themePreviewCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  themePreviewDot: { width: 40, height: 40, borderRadius: 12 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 20 },
  themeGrid: { paddingBottom: 10 },
  themeCell: {
    alignItems: 'center',
    width: (width - 48 - 24) / 4,
    marginBottom: 16,
    position: 'relative',
  },
  themeCellSelected: {},
  themeCard: {
    width: 72,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 8,
    gap: 6,
    justifyContent: 'flex-end',
  },
  miniMsgLeft: { height: 12, width: '60%', borderRadius: 6, alignSelf: 'flex-start' },
  miniMsgRight: { height: 12, width: '70%', borderRadius: 6, alignSelf: 'flex-end' },
  checkBadge: {
    position: 'absolute',
    bottom: 24,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.bloodRed,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  themeLabel: { marginTop: 6, fontSize: 11, fontWeight: '700' },
});
