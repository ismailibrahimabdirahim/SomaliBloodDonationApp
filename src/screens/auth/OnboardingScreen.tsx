import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  FlatList,
  Dimensions,
  StatusBar,
  ViewToken,
} from 'react-native';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  FadeInDown,
  FadeInUp,
  useDerivedValue,
  withSpring
} from 'react-native-reanimated';
import { useTheme, palette } from '../../theme/colors';
import { useLanguage } from '../../context/LanguageContext';
import { WelcomeIcon, SearchIcon, HeroIcon, BloodDrop } from '../../components/onboarding/OnboardingIcons';

const { width, height } = Dimensions.get('window');

type Props = { onComplete: () => void };

const DATA = (t: any) => [
  {
    id: '1',
    title: t('onboarding_1_title'),
    description: t('onboarding_1_desc'),
  },
  {
    id: '2',
    title: t('onboarding_2_title'),
    description: t('onboarding_2_desc'),
  },
  {
    id: '3',
    title: t('onboarding_3_title'),
    description: t('onboarding_3_desc'),
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const FallingDrop = ({ isVisible, onImpact }: { isVisible: boolean, onImpact: () => void }) => {
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const blurScale = useSharedValue(1);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (isVisible && !hasTriggered.current) {
      translateY.value = -150;
      opacity.value = 0;

      translateY.value = withSequence(
        withTiming(height * 0.75, { duration: 2500, easing: Easing.bezier(0.5, 0, 1, 1) }, (finished) => {
          if (finished) {
            runOnJS(onImpact)();
            hasTriggered.current = true;
          }
        }),
        withTiming(height * 0.75, { duration: 200 }),
        withTiming(-150, { duration: 0 })
      );

      opacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(2200, withTiming(0, { duration: 400 }))
      );

      blurScale.value = withSequence(
        withTiming(1.5, { duration: 2200 }),
        withTiming(2.5, { duration: 300 }),
        withTiming(1, { duration: 0 })
      );
    } else if (!isVisible) {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible, onImpact]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: interpolate(translateY.value, [-150, height * 0.75], [0.8, 1.5], Extrapolate.CLAMP) }
    ],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blurScale.value }],
    opacity: interpolate(blurScale.value, [1, 1.5], [0.3, 0.1]),
  }));

  if (!isVisible && !hasTriggered.current) return null;

  return (
    <Animated.View style={[styles.fallingDropContainer, animatedStyle]}>
      {/* Animated Glow/Blur effect */}
      <Animated.View style={[styles.dropGlow, glowStyle, { backgroundColor: palette.bloodRed }]} />
      <BloodDrop size={35} />
    </Animated.View>
  );
};

const SlideText = ({ title, description, isActive, colors }: any) => {
  const titleProgress = useSharedValue(0);
  const descProgress = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      titleProgress.value = withSpring(1, { damping: 12, stiffness: 90 });
      descProgress.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 90 }));
    } else {
      titleProgress.value = withTiming(0, { duration: 300 });
      descProgress.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(titleProgress.value, [0, 1], [40, 0]) },
      { scale: interpolate(titleProgress.value, [0, 1], [0.95, 1]) }
    ],
    opacity: titleProgress.value,
  }));

  const descStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(descProgress.value, [0, 1], [30, 0]) }
    ],
    opacity: descProgress.value,
  }));

  return (
    <View style={styles.textContainer}>
      <Animated.Text style={[styles.title, { color: colors.text }, titleStyle]}>
        {title}
      </Animated.Text>
      <Animated.Text style={[styles.description, { color: colors.textMuted }, descStyle]}>
        {description}
      </Animated.Text>
    </View>
  );
};

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const slidesRef = useRef<FlatList>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      translateX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < DATA(t).length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      slidesRef.current?.scrollToIndex({ index: currentIndex - 1 });
    }
  };

  const RenderItem = ({ item, index }: { item: any, index: number }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        translateX.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [0.85, 1, 0.85],
        Extrapolate.CLAMP
      );

      const opacity = interpolate(
        translateX.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [0, 1, 0],
        Extrapolate.CLAMP
      );

      const slideX = interpolate(
        translateX.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [width * 0.2, 0, -width * 0.2],
        Extrapolate.CLAMP
      );

      return {
        transform: [
          { scale },
          { translateX: slideX }
        ],
        opacity,
      };
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
          {index === 0 && <WelcomeIcon />}
          {index === 1 && <SearchIcon />}
          {index === 2 && <HeroIcon />}
        </Animated.View>
        <SlideText
          title={item.title}
          description={item.description}
          isActive={currentIndex === index}
          colors={colors}
        />
      </View>
    );
  };

  const Paginator = () => {
    return (
      <View style={styles.paginatorContainer}>
        {DATA(t).map((_, i) => {
          const dotStyle = useAnimatedStyle(() => {
            const dotWidth = interpolate(
              translateX.value,
              [(i - 1) * width, i * width, (i + 1) * width],
              [10, 24, 10],
              Extrapolate.CLAMP
            );
            const opacity = interpolate(
              translateX.value,
              [(i - 1) * width, i * width, (i + 1) * width],
              [0.3, 1, 0.3],
              Extrapolate.CLAMP
            );

            return {
              width: dotWidth,
              opacity,
            };
          });

          return (
            <Animated.View
              key={i.toString()}
              style={[
                styles.dot,
                { backgroundColor: palette.bloodRed },
                dotStyle,
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <FallingDrop isVisible={currentIndex === 0} onImpact={scrollToNext} />

      <View style={styles.header}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            onPress={goBack}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButtonPlaceholder} />
        )}

        <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <AnimatedFlatList
        ref={slidesRef}
        data={DATA(t)}
        renderItem={({ item, index }: any) => <RenderItem item={item} index={index} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item: any) => item.id}
        onScroll={scrollHandler}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
      />

      <View style={styles.footer}>
        <Paginator />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.bloodRed }]}
          onPress={scrollToNext}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>
            {currentIndex === DATA(t).length - 1 ? t('get_started') : t('next')}
          </Text>
          <ArrowRight size={20} color={palette.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    zIndex: -1, // Ensure it's behind everything
  },
  blobTop: {
    top: -width * 0.2,
    right: -width * 0.2,
  },
  blobBottom: {
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  fallingDropContainer: {
    position: 'absolute',
    left: width / 2 - 17.5,
    top: height * 0.15,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24, // Increased padding
    marginTop: 10, // Extra margin from top
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconButtonPlaceholder: {
    width: 44,
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 32,
    overflow: 'visible', // Prevent 3D clipping
  },
  illustrationContainer: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'visible', // Prevent 3D clipping
  },
  textContainer: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  description: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    zIndex: 1,
  },
  paginatorContainer: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  button: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: palette.bloodRed,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1,
  },
  buttonText: {
    color: palette.white,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
