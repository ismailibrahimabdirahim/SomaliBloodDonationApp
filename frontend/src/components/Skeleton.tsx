import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/colors';

type Props = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({ width, height, borderRadius, style }: Props) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height: height ?? 20,
          borderRadius: borderRadius ?? 8,
          backgroundColor: isDark ? '#334155' : '#e2e8f0',
          opacity,
        } as any,
        style,
      ]}
    />
  );
}
