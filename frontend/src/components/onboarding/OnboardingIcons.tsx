import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Easing,
  useAnimatedProps
} from 'react-native-reanimated';
import { palette } from '../../theme/colors';

const { width } = Dimensions.get('window');
const ICON_SIZE = width * 0.5; // Reduced further to prevent clipping

// Casting to any to avoid strict SVG type mismatches with AnimatedStyle in some environments
const AnimatedPath = Animated.createAnimatedComponent(Path) as any;
const AnimatedCircle = Animated.createAnimatedComponent(Circle) as any;
const AnimatedG = Animated.createAnimatedComponent(G) as any;

export const BloodDrop = ({ size = 30 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
    <Defs>
      <LinearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FF5252" stopOpacity="1" />
        <Stop offset="100%" stopColor={palette.bloodRed} stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Path
      d="M50 5C50 5 20 45 20 70C20 86.5 33.5 100 50 100C66.5 100 80 81.5 80 70C80 45 50 5 50 5Z"
      fill="url(#dropGrad)"
    />
  </Svg>
);

export const WelcomeIcon = () => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.container}>
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F5F5F5" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Doctor Silhouette/Icon */}
        <AnimatedG style={animatedStyle} originX={50} originY={50}>
          {/* Head */}
          <Circle cx="50" cy="25" r="12" fill="#FFE0B2" />
          {/* Glasses/Details */}
          <Rect x="42" y="23" width="16" height="2" fill="#333" rx="1" />
          
          {/* Body/Coat */}
          <Path
            d="M30 45 C30 45 20 45 20 60 V100 H80 V60 C80 45 70 45 70 45 L50 65 L30 45Z"
            fill="url(#coatGrad)"
            stroke="#EEE"
            strokeWidth="0.5"
          />
          
          {/* Stethoscope */}
          <Path
            d="M40 25 C40 35 60 35 60 25"
            fill="none"
            stroke="#546E7A"
            strokeWidth="1.5"
          />
          <Circle cx="50" cy="55" r="5" fill="#546E7A" opacity="0.8" />
          
          {/* Heart on Coat */}
          <Path
            d="M72 55C72 55 68 52 68 48C68 45 70 43 72 45C74 43 76 45 76 48C76 52 72 55 72 55Z"
            fill={palette.bloodRed}
          />
        </AnimatedG>

        {/* Decorative background pulse */}
        <AnimatedCircle
          cx="50"
          cy="50"
          r="45"
          fill={palette.bloodRed}
          opacity={0.05}
          animatedProps={useAnimatedProps(() => ({
             transform: [{ scale: pulse.value }],
          }))}
        />
      </Svg>
    </View>
  );
};

export const SearchIcon = () => {
  const rotation = useSharedValue(0);
  const scanPulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
    scanPulse.value = withRepeat(withTiming(1.2, { duration: 1500 }), -1, true);
  }, []);

  const animatedSearchProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedRingProps = useAnimatedProps(() => ({
    transform: [{ scale: scanPulse.value }],
    opacity: interpolate(scanPulse.value, [1, 1.2], [0.3, 0.1]),
  }));

  return (
    <View style={styles.container}>
      {/* Set overflow to visible to prevent any clipping during rotation */}
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="-10 -10 120 120" style={{ overflow: 'visible' }}>
        <Path d="M30 40 L70 60" stroke={palette.bloodRed} strokeWidth="0.5" opacity={0.1} />
        <Path d="M40 70 L60 30" stroke={palette.bloodRed} strokeWidth="0.5" opacity={0.1} />
        
        <Circle cx="30" cy="40" r="2" fill={palette.bloodRed} opacity="0.4" />
        <Circle cx="70" cy="60" r="3" fill={palette.bloodRed} opacity="0.6" />
        <Circle cx="40" cy="70" r="3" fill={palette.bloodRed} opacity="0.6" />
        <Circle cx="60" cy="30" r="3" fill={palette.bloodRed} opacity="0.6" />
        
        <AnimatedCircle 
          cx="50" 
          cy="50" 
          r="30" 
          stroke={palette.bloodRed} 
          strokeWidth="1" 
          fill="none" 
          animatedProps={animatedRingProps} 
        />
        
        <AnimatedG animatedProps={animatedSearchProps} originX={50} originY={50}>
          <Circle cx="50" cy="50" r="18" stroke={palette.bloodRed} strokeWidth="3" fill="none" />
          <Path d="M64 64 L75 75" stroke={palette.bloodRed} strokeWidth="6" strokeLinecap="round" />
        </AnimatedG>

        <Path
          d="M35 25 L55 25 L65 45 L55 75 L35 80 L25 50 Z"
          fill={palette.bloodRed}
          opacity={0.05}
        />
      </Svg>
    </View>
  );
};

export const HeroIcon = () => {
  const blink = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    blink.value = withRepeat(withTiming(0.2, { duration: 1000 }), -1, true);
    float.value = withRepeat(withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animatedSparkleProps = useAnimatedProps(() => ({
    opacity: blink.value,
  }));

  const animatedHeartProps = useAnimatedProps(() => ({
    transform: [{ translateY: float.value }],
  }));

  const somaliBlue = '#4189DD';

  return (
    <View style={styles.container}>
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        <AnimatedG animatedProps={animatedHeartProps}>
          {/* Heart Shape in Somali Flag Blue */}
          <Path
            d="M50 90 C50 90 10 65 10 40 C10 20 30 15 50 35 C70 15 90 20 90 40 C90 65 50 90 50 90Z"
            fill={somaliBlue}
          />
          {/* 3D Depth Shading */}
          <Path
            d="M50 90 C50 90 10 65 10 40 C10 20 30 15 50 35 V90Z"
            fill="white"
            opacity={0.1}
          />

          {/* Somali Flag Star (Centered in heart body) */}
          <G transform="translate(50, 52)">
            <Path
              d="M0 -14.5 L4 -4 L14.5 -4 L6 3 L10 13 L0 6.5 L-10 13 L-6 3 L-14.5 -4 L-4 -4 Z"
              fill="white"
            />
          </G>
        </AnimatedG>

        {/* Sparkles */}
        <AnimatedG animatedProps={animatedSparkleProps}>
          <Path d="M25 25 L29 21 M25 21 L29 25" stroke="#FFD740" strokeWidth="2" />
          <Path d="M75 20 L80 15 M75 15 L80 20" stroke="#FFD740" strokeWidth="2" />
          <Path d="M85 70 L90 65 M85 65 L90 70" stroke="#FFD740" strokeWidth="2" />
        </AnimatedG>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    width: ICON_SIZE,
    height: ICON_SIZE,
    overflow: 'visible', // Critical for preventing 3D clipping
  },
});
