import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Droplets } from 'lucide-react-native';
import { useTheme, palette } from '../../theme/colors';

type Props = { onGetStarted: () => void };

export default function WelcomeScreen({ onGetStarted }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bloodRed }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.decor} pointerEvents="none" />

          <View style={styles.heroTop}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarRing, { borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Image
                  style={styles.avatarImg}
                  source={{
                    uri: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop',
                  }}
                />
              </View>
              <View style={[styles.badgeStar, { backgroundColor: palette.white }]}>
                <View style={[styles.badgeStarInner, { backgroundColor: '#60A5FA' }]} />
              </View>
              <View style={[styles.emergencyBadge, { backgroundColor: isDark ? colors.card : palette.white }]}>
                <View style={[styles.emergencyIcon, { backgroundColor: palette.bloodRed }]}>
                  <Droplets size={20} color={palette.white} fill={palette.white} />
                </View>
                <View style={styles.emergencyText}>
                  <Text style={[styles.emergencyLabel, { color: colors.textMuted }]}>EMERGENCY</Text>
                  <Text style={[styles.emergencyValue, { color: colors.text }]}>O+ Needed</Text>
                </View>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: palette.white }]}>SomaliBD</Text>
              <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.92)' }]}>Connect donors and save lives in Somalia.</Text>
              <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            </View>
          </View>

          <View style={[styles.footerCard, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={[styles.disclaimer, { color: 'rgba(255,255,255,0.78)' }]}>
              By continuing, you are joining Mogadishu's largest network of life savers.
            </Text>
            <TouchableOpacity style={[styles.cta, { backgroundColor: palette.white }]} onPress={onGetStarted} activeOpacity={0.9}>
              <Text style={[styles.ctaText, { color: palette.bloodRed }]}>Get Started</Text>
              <ArrowRight size={20} color={palette.bloodRed} />
            </TouchableOpacity>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: palette.white }]}>12k+</Text>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.62)' }]}>DONORS</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: palette.white }]}>45</Text>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.62)' }]}>HOSPITALS</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: palette.white }]}>24/7</Text>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.62)' }]}>SUPPORT</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  decor: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  heroTop: { alignItems: 'center', marginTop: 16 },
  avatarWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 232,
    height: 232,
    borderRadius: 116,
    borderWidth: 4,
    padding: 4,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 112,
  },
  badgeStar: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeStarInner: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  emergencyBadge: {
    position: 'absolute',
    bottom: -20,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyText: { paddingRight: 6 },
  emergencyLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  emergencyValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  titleBlock: { alignItems: 'center', marginTop: 48 },
  title: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  divider: {
    marginTop: 16,
    height: 4,
    width: 64,
    borderRadius: 2,
  },
  footerCard: {
    marginTop: 36,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 6,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  statSep: { width: 1, height: 22 },
});
