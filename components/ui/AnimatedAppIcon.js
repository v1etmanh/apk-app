import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, View } from 'react-native';
import LottieView from 'lottie-react-native';

const LOTTIE_SOURCES = {
  'nav-home': require('../../assets/animations/icons/icon-nav-home.json'),
  'nav-today': require('../../assets/animations/icons/icon-nav-today.json'),
  'nav-history': require('../../assets/animations/icons/icon-nav-history.json'),
  'home-suggest': require('../../assets/animations/icons/icon-home-suggest.json'),
  'home-fridge': require('../../assets/animations/icons/icon-home-fridge.json'),
  'settings-gear': require('../../assets/animations/icons/icon-settings-gear.json'),
};

const IMAGE_SOURCES = {
  'profile-personal': require('../../assets/icon/profile-personal.webp'),
  'profile-metrics': require('../../assets/icon/profile-metrics.webp'),
  'profile-region': require('../../assets/icon/profile-region.webp'),
  'profile-diet': require('../../assets/icon/profile-diet.webp'),
  'profile-allergy-menu': require('../../assets/icon/profile-allergy-menu.webp'),
  'profile-taste-menu': require('../../assets/icon/profile-taste-menu.webp'),
  'profile-allergy-food': require('../../assets/icon/profile-allergy-food.webp'),
  'profile-taste-food': require('../../assets/icon/profile-taste-food.webp'),
  'settings-reminder': require('../../assets/icon/settings-reminder.webp'),
  'settings-budget': require('../../assets/icon/settings-budget.webp'),
  'settings-timer': require('../../assets/icon/settings-timer.webp'),
  'settings-language': require('../../assets/icon/settings-language.webp'),
  'settings-logout': require('../../assets/icon/settings-logout.webp'),
};

export const APP_ICON_NAMES = Object.freeze([
  ...Object.keys(LOTTIE_SOURCES),
  ...Object.keys(IMAGE_SOURCES),
]);

export default function AnimatedAppIcon({
  name,
  size = 40,
  active = true,
  trigger = 0,
  playOnVisible = false,
  delay = 0,
  fallback = null,
  style,
}) {
  const source = LOTTIE_SOURCES[name];
  const imageSource = IMAGE_SOURCES[name];
  const ref = useRef(null);
  const timerRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (alive) setReduceMotion(value); })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appState = AppState.addEventListener('change', value => setAppActive(value === 'active'));
    return () => {
      alive = false;
      motion.remove();
      appState.remove();
    };
  }, []);

  const syncPlayback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!active || !appActive || reduceMotion) {
      ref.current?.reset();
      return;
    }
    if (!playOnVisible && !trigger) return;
    timerRef.current = setTimeout(() => {
      ref.current?.reset();
      ref.current?.play();
    }, Math.max(0, delay));
  }, [active, appActive, delay, playOnVisible, reduceMotion, trigger]);

  useEffect(() => {
    if (loaded) syncPlayback();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loaded, syncPlayback]);

  if ((!source && !imageSource) || failed) {
    return <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>{fallback}</View>;
  }

  if (imageSource) {
    return (
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ width: size, height: size }, style]}
      >
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      <LottieView
        ref={ref}
        source={source}
        autoPlay={false}
        loop={false}
        resizeMode="contain"
        onAnimationLoaded={() => setLoaded(true)}
        onAnimationFailure={() => setFailed(true)}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
