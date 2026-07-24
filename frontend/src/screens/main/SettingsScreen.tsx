import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Moon, Sun, Bell, Shield, Info, ChevronRight, Globe, HelpCircle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, palette } from '../../theme/colors';
import { useThemeContext } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { themeMode, setThemeMode, toggleTheme } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [push, setPush] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);

  const groups = [
    {
      title: t('settings'),
      items: [
        {
          id: 'dark',
          label: t('dark_mode'),
          icon: isDark ? Sun : Moon,
          type: 'toggle' as const,
          value: isDark,
          onToggle: toggleTheme,
        },
        { id: 'lang', label: t('language'), icon: Globe, type: 'link' as const, value: language, onPress: () => setShowLangModal(true) },
      ],
    },
    {
      title: t('notifications'),
      items: [{ id: 'push', label: t('push_notifications'), icon: Bell, type: 'toggle' as const, value: push, onToggle: setPush }],
    },
    {
      title: t('security'),
      items: [
        { id: 'privacy', label: t('privacy_policy'), icon: Shield, type: 'link' as const },
        { id: 'help', label: t('help_center'), icon: HelpCircle, type: 'link' as const },
        { id: 'about', label: t('about_app'), icon: Info, type: 'link' as const },
      ],
    },
  ];

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.backBox, { backgroundColor: colors.inputBg }]} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {groups.map((g) => (
          <View key={g.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{g.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {g.items.map((item, j) => {
                const Icon = item.icon;
                return (
                  <View key={item.id}>
                    <TouchableOpacity 
                      style={styles.row} 
                      activeOpacity={0.75}
                      onPress={item.type === 'link' ? (item as any).onPress : undefined}
                    >
                      <View style={styles.rowLeft}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.inputBg }]}>
                          <Icon size={20} color={colors.textMuted} />
                        </View>
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                      </View>
                      {item.type === 'toggle' ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: isDark ? palette.slate700 : palette.slate200, true: palette.bloodRed }}
                          thumbColor={palette.white}
                        />
                      ) : (
                        <View style={styles.rowRight}>
                          {'value' in item && item.value ? (
                            <Text style={[styles.rowValue, { color: colors.textMuted }]}>{item.value}</Text>
                          ) : null}
                          <ChevronRight size={16} color={colors.border} />
                        </View>
                      )}
                    </TouchableOpacity>
                    {j < g.items.length - 1 ? <View style={[styles.sep, { backgroundColor: colors.border }]} /> : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View style={styles.systemSetting}>
             <Text style={[styles.systemLabel, { color: colors.textMuted }]}>{t('theme_preference')}: {themeMode.toUpperCase()}</Text>
             <TouchableOpacity onPress={() => setThemeMode('system')}>
                 <Text style={{ color: palette.bloodRed, fontWeight: '800' }}>{t('reset_to_system')}</Text>
             </TouchableOpacity>
        </View>
      <Text style={[styles.version, { color: colors.textMuted }]}>{`SomaliBD Version 1.0.6`}</Text>
      </ScrollView>

      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity style={styles.modalBack} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <View style={[styles.langSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetIndicator, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{`Select Language`}</Text>
            
            <TouchableOpacity 
              style={[styles.langItem, language === 'English' && { backgroundColor: colors.inputBg }]}
              onPress={() => { setLanguage('English'); setShowLangModal(false); }}
            >
              <Text style={[styles.langText, { color: colors.text }, language === 'English' && { color: palette.bloodRed }]}>{`English`}</Text>
              {language === 'English' && <View style={[styles.dot, { backgroundColor: palette.bloodRed }]} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.langItem, language === 'Somali' && { backgroundColor: colors.inputBg }]}
              onPress={() => { setLanguage('Somali'); setShowLangModal(false); }}
            >
              <Text style={[styles.langText, { color: colors.text }, language === 'Somali' && { color: palette.bloodRed }]}>{`Somali`}</Text>
              {language === 'Somali' && <View style={[styles.dot, { backgroundColor: palette.bloodRed }]} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetClose} onPress={() => setShowLangModal(false)}>
              <Text style={{ color: palette.bloodRed, fontWeight: '900' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 40 },
  group: { marginBottom: 22 },
  groupTitle: {
    paddingHorizontal: 8,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontWeight: '800', fontSize: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 12, fontWeight: '800' },
  sep: { height: 1, marginHorizontal: 16 },
  systemSetting: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: -10, marginBottom: 20 },
  systemLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  version: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 12,
  },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  langSheet: {
    padding: 32,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    alignItems: 'center',
  },
  sheetIndicator: { width: 40, height: 4, borderRadius: 2, marginBottom: 24, marginTop: -12 },
  sheetTitle: { fontSize: 20, fontWeight: '900', marginBottom: 28 },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    marginBottom: 8,
  },
  langText: { fontSize: 16, fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sheetClose: { marginTop: 24, padding: 10 },
});
