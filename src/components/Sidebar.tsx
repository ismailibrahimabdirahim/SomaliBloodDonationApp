import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { X, Home, User, Settings, Info, LogOut, Droplets, ChevronRight, Moon, Sun } from 'lucide-react-native';
import { useTheme, palette } from '../theme/colors';
import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setScreen: (screen: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  isOpen,
  onClose,
  setScreen,
  onLogout,
}: Props) {
  const { colors, isDark } = useTheme();
  const { toggleTheme } = useThemeContext();
  const { user } = useAuth();
  const { t } = useLanguage();
  const slide = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (!isOpen) return;
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [isOpen, slide]);

  useEffect(() => {
    if (isOpen) return;
    Animated.timing(slide, { toValue: -width, duration: 220, useNativeDriver: true }).start();
  }, [isOpen, slide]);

  const menuItems: { id: string; label: string; icon: any }[] = [
    { id: 'MainTabs', label: t('dashboard'), icon: Home },
    { id: 'ProfileTab', label: t('my_profile'), icon: User },
    { id: 'RequestsTab', label: t('blood_requests'), icon: Droplets },
    { id: 'Settings', label: t('settings'), icon: Settings },
    { id: 'logout', label: t('logout'), icon: LogOut },
  ];

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={[styles.backdrop, { backgroundColor: palette.blackOverlay60 }]} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.drawer, { backgroundColor: colors.background, transform: [{ translateX: slide }] }]}>
          <View style={[styles.drawerHeader, { backgroundColor: palette.bloodRed }]}>
            <View style={styles.userRow}>
              <View style={styles.userLeft}>
                <Image
                  style={[styles.userAvatar, { borderColor: 'rgba(255,255,255,0.35)' }]}
                  source={{
                    uri:
                      user?.profileImage && String(user?.profileImage).length > 0
                        ? String(user?.profileImage)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.name || 'User'))}&background=random&color=fff`,
                  }}
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: palette.white }]} numberOfLines={1}>
                    {String(user?.name || 'User')}
                  </Text>
                  <Text style={[styles.userSub, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
                    {`${t('blood_type')}: ${String(user?.bloodType || 'A+')}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <X size={20} color={palette.white} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.id === 'logout') onLogout();
                    else setScreen(item.id);
                    onClose();
                  }}
                >
                  <View style={styles.menuLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: colors.inputBg }]}>
                      <Icon size={20} color={palette.bloodRed} />
                    </View>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.border} />
                </TouchableOpacity>
              );
            })}

            <View style={[styles.themeRow, { backgroundColor: colors.inputBg, borderTopColor: colors.border }]}>
              <View style={styles.themeLeft}>
                {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color={colors.textMuted} />}
                <Text style={[styles.themeText, { color: colors.text }]}>{isDark ? t('light_mode').toUpperCase() : t('dark_mode').toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.themeSwitch, { backgroundColor: palette.slate300 }, isDark && { backgroundColor: palette.bloodRed }]}
              >
                <View style={[styles.themeKnob, { backgroundColor: palette.white }, isDark && styles.themeKnobOn]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.inputBg, borderTopColor: colors.border }]}>
            <View style={styles.footerRow}>
              <Info size={14} color={colors.textMuted} />
              <Text style={[styles.footerVer, { color: colors.textMuted }]}>SomaliBD v1.0.6</Text>
            </View>
            <Text style={[styles.footerCopy, { color: colors.textMuted }]}>
              Connecting blood donors with those in need across Somalia. Every drop counts.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  drawer: {
    width: Math.min(width * 0.85, 320),
    height: '100%',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    elevation: 20,
  },
  drawerHeader: {
    padding: 26,
    paddingBottom: 28,
  },
  headerBlob: {
    position: 'absolute',
    top: -30,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 22 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    gap: 12,
  },
  userLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userInfo: {
    flex: 1,
  },
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
  },
  userName: { fontSize: 18, fontWeight: '800' },
  userSub: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  menu: { flex: 1 },
  menuContent: { padding: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 6,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontWeight: '800', fontSize: 14 },
  themeRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  themeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  themeSwitch: {
    width: 44,
    height: 24,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  themeKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },
  themeKnobOn: { alignSelf: 'flex-end' },
  footer: {
    padding: 22,
    borderTopWidth: 1,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  footerVer: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  footerCopy: { fontSize: 10, lineHeight: 15 },
});
