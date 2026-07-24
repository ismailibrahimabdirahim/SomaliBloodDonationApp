import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Settings,
  LogOut,
  Heart,
  History,
  Calendar,
  Edit3,
  Camera,
  User,
  Save,
  X,
  CheckCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { MainTabParamList } from '../../navigation/types';
import { useRootNavigation } from '../../navigation/useRootNavigation';
import { useAlert } from '../../context/AlertContext';

type ProfileState = {
  name: string;
  location: string;
  bloodType: string;
  bio: string;
  donations: number;
  profileImage: string;
};

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Profile'>>();
  const rootNav = useRootNavigation();
  const { user, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false); // No more full screen loading
  const [profile, setProfile] = useState<ProfileState>({
    name: user?.name || '',
    location: user?.location || 'Mogadishu, Somalia',
    bloodType: user?.bloodType || 'O+',
    bio: user?.bio || 'Ready to help anyone in need.',
    donations: user?.donations || 0,
    profileImage: user?.profileImage || '',
  });
  const [isSaved, setIsSaved] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/profile');
      const d = data as Record<string, unknown>;
      setProfile({
        name: String(d.name || ''),
        location: String(d.location || 'Mogadishu, Somalia'),
        bloodType: String(d.bloodType || 'O+'),
        bio: String(d.bio || 'Ready to help anyone in need.'),
        donations: Number(d.donations || 0),
        profileImage: String(d.profileImage || ''),
      });
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const history = [
    { id: 1, hospital: 'Erdogan Hospital', date: 'March 14, 2024', amount: '450ml', status: 'Verified' },
    { id: 2, hospital: 'Medina Hospital', date: 'January 02, 2024', amount: '450ml', status: 'Verified' },
  ];

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Lower quality for faster upload
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setProfile({ ...profile, profileImage: `data:image/jpeg;base64,${result.assets[0].base64}` });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to pick image' });
    }
  };

  const handleSave = async () => {
    // OPTIMISTIC UPDATE: Show success immediately!
    const originalProfile = { ...profile };
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    
    // Update global state immediately
    await updateUser(profile);

    try {
      // Save to server in the background
      const res = await api.put('/api/profile', profile, { timeout: 60000 });
      if (res.status < 200 || res.status >= 300) {
        throw new Error('Server rejected the update');
      }
    } catch (err) {
      console.error("Background save error:", err);
      // Revert if it fails (optional, but good practice)
      // setProfile(originalProfile);
      // updateUser(originalProfile);
      showAlert({ 
        type: 'error', 
        title: 'Sync Error', 
        message: 'Your profile was updated locally, but we couldn\'t save it to our server. Please check your internet.' 
      });
    }
  };


  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
          <View style={styles.headerBlob} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]} onPress={() => tabNav.navigate('Home')}>
              <Text style={[styles.backChev, { color: palette.white }]}>{`‹`}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: palette.white }]}>{t('my_profile')}</Text>
            <TouchableOpacity style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]} onPress={() => rootNav.navigate('Settings')}>
              <Settings size={22} color={palette.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[
            styles.card, 
            { 
              backgroundColor: colors.card, 
              borderColor: colors.border, 
              shadowColor: isDark ? 'rgba(0,0,0,0.8)' : '#000',
              shadowOpacity: isDark ? 0.3 : 0.1
            }
          ]}>
            <View style={styles.avatarWrap}>
              {profile.profileImage ? (
                <Image
                  style={[styles.avatar, { borderColor: palette.white }]}
                  source={{ uri: profile.profileImage }}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.inputBg, borderColor: palette.white }]}>
                  <User size={64} color={colors.textMuted} />
                </View>
              )}
              {isEditing ? (
                <TouchableOpacity
                  style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                  onPress={pickImage}
                >
                  <Camera size={32} color={palette.white} />
                </TouchableOpacity>
              ) : null}
              <View style={[styles.bloodBadge, { backgroundColor: palette.bloodRed, borderColor: palette.white }]}>
                <Text style={[styles.bloodBadgeText, { color: palette.white }]}>{String(profile.bloodType)}</Text>
              </View>
            </View>

            {!isEditing ? (
              <>
                <Text style={[styles.name, { color: colors.text }]}>{String(profile.name)}</Text>
                <View style={styles.locRow}>
                  <MapPin size={16} color={palette.bloodRed} />
                  <Text style={[styles.loc, { color: colors.textMuted }]}>{String(profile.location)}</Text>
                </View>
                <Text style={[styles.bio, { color: colors.textMuted }]}>{`"${profile.bio}"`}</Text>
                <TouchableOpacity style={[styles.editPill, { backgroundColor: colors.inputBg }]} onPress={() => setIsEditing(true)}>
                  <Edit3 size={16} color={colors.textMuted} />
                  <Text style={[styles.editPillText, { color: colors.text }]}>{t('edit_profile')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <FieldRow icon={<User size={16} color="#3B82F6" />}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={profile.name}
                    onChangeText={(val) => setProfile({ ...profile, name: val })}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textMuted}
                  />
                </FieldRow>
                <FieldRow icon={<MapPin size={16} color="#EF4444" />}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={profile.location}
                    onChangeText={(val) => setProfile({ ...profile, location: val })}
                    placeholder="Location"
                    placeholderTextColor={colors.textMuted}
                  />
                </FieldRow>
                <TextInput
                  style={[styles.bioInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                  value={profile.bio}
                  onChangeText={(val) => setProfile({ ...profile, bio: val })}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.inputBg }]} onPress={() => setIsEditing(false)}>
                    <X size={18} color={colors.textMuted} />
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: palette.bloodRed }]} 
                    onPress={handleSave}
                  >
                    <Save size={18} color={palette.white} />
                    <Text style={[styles.saveBtnText, { color: palette.white }]}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: colors.card, 
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 12,
                elevation: 4
              }
            ]}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(211,47,47,0.1)' : palette.red50 }]}>
                <Heart size={24} color={palette.bloodRed} fill={palette.bloodRed} />
              </View>
              <Text style={[styles.statNum, { color: colors.text }]}>{String(profile.donations)}</Text>
              <Text style={[styles.statCap, { color: colors.textMuted }]}>{t('donations_stat')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.bloodRed, borderColor: palette.bloodRed, elevation: 4 }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Calendar size={24} color={palette.white} />
              </View>
              <Text style={[styles.statNum, { color: palette.white }]}>{t('active_status')}</Text>
              <Text style={[styles.statCap, { color: 'rgba(255,255,255,0.85)' }]}>{t('status_stat')}</Text>
            </View>
          </View>

          <View style={styles.histHead}>
            <Text style={[styles.histTitle, { color: colors.text }]}>{t('donation_history')}</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: palette.bloodRed }]}>{t('see_all')}</Text>
            </TouchableOpacity>
          </View>
          {history.map((item) => (
            <View key={item.id} style={[
              styles.histCard, 
              { 
                backgroundColor: colors.card, 
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 8,
                elevation: 2
              }
            ]}>
              <View style={[styles.histIcon, { backgroundColor: colors.inputBg }]}>
                <History size={24} color={palette.bloodRed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.histHosp, { color: colors.text }]}>{String(item.hospital)}</Text>
                <Text style={[styles.histMeta, { color: colors.textMuted }]}>{`${item.date} • ${item.amount}`}</Text>
              </View>
              <View style={[styles.verified, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : palette.green50 }]}>
                <Text style={[styles.verifiedText, { color: isDark ? palette.green500 : palette.green600 }]}>{String(item.status.toUpperCase())}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.logout} onPress={() => logout()}>
            <LogOut size={18} color={colors.textMuted} />
            <Text style={[styles.logoutText, { color: colors.textMuted }]}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isSaved ? (
        <View style={[styles.toast, { backgroundColor: palette.green500 }]}>
          <CheckCircle size={16} color={palette.white} />
          <Text style={[styles.toastText, { color: palette.white }]}>Changed Successfully</Text>
        </View>
      ) : null}
    </View>
  );
}

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.inputBg }]}>
      {icon}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  header: {
    paddingTop: 0,
    paddingBottom: 72,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backChev: { fontSize: 28, fontWeight: '900', marginTop: -4 },
  headerTitle: { fontWeight: '900', fontSize: 22 },
  body: { marginTop: -56, paddingHorizontal: 22, zIndex: 2 },
  card: {
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 18,
    elevation: 6,
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  avatarWrap: { marginBottom: 18 },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  bloodBadgeText: { fontWeight: '900', fontSize: 16 },
  name: { fontSize: 26, fontWeight: '900' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 },
  loc: { fontWeight: '800' },
  bio: { textAlign: 'center', fontWeight: '600', marginBottom: 18, maxWidth: 300 },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  editPillText: { fontWeight: '800' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    width: '100%',
    marginBottom: 12,
  },
  input: { flex: 1, fontWeight: '800' },
  bioInput: {
    width: '100%',
    minHeight: 100,
    borderRadius: 16,
    padding: 16,
    fontWeight: '600',
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  editActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtnText: { fontWeight: '800' },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 22 },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statNum: { fontSize: 28, fontWeight: '900' },
  statCap: { marginTop: 6, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  histHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  histTitle: { fontSize: 20, fontWeight: '900' },
  seeAll: { fontWeight: '800' },
  histCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 10,
  },
  histIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histHosp: { fontWeight: '800' },
  histMeta: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  verified: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  verifiedText: { fontSize: 9, fontWeight: '900' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 16,
  },
  logoutText: { fontWeight: '800' },
  toast: {
    position: 'absolute',
    top: 56,
    left: 22,
    right: 22,
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 8,
  },
  toastText: { fontWeight: '800' },
});
