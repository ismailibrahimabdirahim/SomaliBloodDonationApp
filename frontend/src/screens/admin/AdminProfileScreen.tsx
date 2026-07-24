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
  Phone,
  Save,
  X,
  CheckCircle,
  ShieldCheck,
  Mail,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

type ProfileState = {
  name: string;
  email: string;
  location: string;
  bloodType: string;
  phone: string;
  bio: string;
  donations: number;
  profileImage: string;
};

export default function AdminProfileScreen() {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    name: user?.name || '',
    email: user?.email || '',
    location: user?.location || 'Mogadishu, Somalia',
    bloodType: user?.bloodType || 'O+',
    phone: user?.phone || '',
    bio: user?.bio || 'Admin - Managing blood donation services.',
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
        email: String(d.email || ''),
        location: String(d.location || 'Mogadishu, Somalia'),
        bloodType: String(d.bloodType || 'O+'),
        phone: String(d.phone || ''),
        bio: String(d.bio || 'Admin - Managing blood donation services.'),
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
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
    const originalProfile = { ...profile };
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    
    await updateUser(profile);

    try {
      const res = await api.put('/api/profile', profile, { timeout: 60000 });
      if (res.status < 200 || res.status >= 300) {
        throw new Error('Server rejected the update');
      }
    } catch (err) {
      console.error("Background save error:", err);
      showAlert({ 
        type: 'error', 
        title: 'Sync Error', 
        message: 'Your profile was updated locally, but we couldn\'t save it to our server. Please check your internet.' 
      });
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.backChev, { color: palette.white }]}>{`‹`}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: palette.white }]}>Admin Profile</Text>
            <TouchableOpacity style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]} onPress={handleLogout}>
              <LogOut size={22} color={palette.white} />
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
              {profile.profileImage && profile.profileImage.trim().length > 0 ? (
                <View style={[styles.avatar, { borderColor: palette.white }]}>
                  <Image
                    style={styles.avatarImage}
                    source={{ uri: profile.profileImage }}
                  />
                </View>
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.inputBg, borderColor: palette.white }]}>
                  <User size={64} color={colors.textMuted} />
                </View>
              )}
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
                  <Text style={[styles.editPillText, { color: colors.text }]}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.uploadPhotoBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={pickImage}>
                  <Camera size={18} color={palette.bloodRed} />
                  <Text style={[styles.uploadPhotoBtnText, { color: colors.text }]}>Upload Photo</Text>
                </TouchableOpacity>
                <FieldRow icon={<User size={16} color="#3B82F6" />}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={profile.name}
                    onChangeText={(val) => setProfile({ ...profile, name: val })}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textMuted}
                  />
                </FieldRow>
                <FieldRow icon={<Mail size={16} color="#EF4444" />}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={profile.email}
                    onChangeText={(val) => setProfile({ ...profile, email: val })}
                    placeholder="Email"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                <FieldRow icon={<Phone size={16} color="#22C55E" />}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={profile.phone}
                    onChangeText={(val) => setProfile({ ...profile, phone: val })}
                    placeholder="Phone"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
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
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: palette.bloodRed }]} 
                    onPress={handleSave}
                  >
                    <Save size={18} color={palette.white} />
                    <Text style={[styles.saveBtnText, { color: palette.white }]}>Save</Text>
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
              <Text style={[styles.statCap, { color: colors.textMuted }]}>Donations</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.bloodRed, borderColor: palette.bloodRed, elevation: 4 }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <ShieldCheck size={24} color={palette.white} />
              </View>
              <Text style={[styles.statNum, { color: palette.white }]}>Admin</Text>
              <Text style={[styles.statCap, { color: 'rgba(255,255,255,0.85)' }]}>Status</Text>
            </View>
          </View>

          {isSaved && (
            <View style={[styles.successBanner, { backgroundColor: palette.green50 }]}>
              <CheckCircle size={20} color={palette.green600} />
              <Text style={[styles.successText, { color: palette.green600 }]}>Profile saved successfully!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIcon}>{icon}</View>
      <View style={styles.fieldInput}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backChev: { fontSize: 28, fontWeight: '300', marginTop: -4 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 8,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 56 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignSelf: 'center',
  },
  uploadPhotoBtnText: { fontSize: 14, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  locRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  loc: { fontSize: 14, fontWeight: '600' },
  bio: { fontSize: 14, fontWeight: '600', textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  editPillText: { fontSize: 14, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  fieldIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fieldInput: { flex: 1 },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  bioInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16,
  },
  editActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNum: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statCap: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  successText: { fontSize: 14, fontWeight: '700' },
});
