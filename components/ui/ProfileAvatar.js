import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, View, Text } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { resolveProfileAvatar } from '../../utils/profileIdentity';

const SOURCES = {
  father: require('../../assets/animations/plan/father.json'),
  mother: require('../../assets/animations/plan/mother.json'),
  brother: require('../../assets/animations/plan/brother.json'),
  sister: require('../../assets/animations/plan/sister.json'),
  kitten: require('../../assets/animations/plan/kitten.json'),
  'tabby-girl': require('../../assets/animations/plan/tabby-girl.json'),
  grandpa: require('../../assets/animations/plan/grandpa.json'),
  grandma: require('../../assets/animations/plan/grandma.json'),
};

// Refresh when the screen is revisited, the app resumes, or the calendar year changes.
export function useProfileYear() {
  const focused = useIsFocused();
  const [year, setYear] = useState(() => new Date().getFullYear());
  useEffect(() => {
    const refresh = () => setYear(new Date().getFullYear());
    refresh();
    const subscription = AppState.addEventListener('change', refresh);
    const timer = focused ? setInterval(refresh, 60000) : null;
    return () => { subscription.remove(); if (timer) clearInterval(timer); };
  }, [focused]);
  return year;
}

export default function ProfileAvatar({ profile, size = 48, animated = false, visible = true, style }) {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const year = useProfileYear();
  const { key } = resolveProfileAvatar(profile, year);
  const ref = useRef(null);
  const [failedKey, setFailedKey] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const state = AppState.addEventListener('change', value => setAppActive(value === 'active'));
    return () => { alive = false; motion.remove(); state.remove(); };
  }, []);
  const playing = animated && visible && focused && appActive && !reduceMotion;
  const syncPlayback = useCallback(() => {
    if (playing) ref.current?.play();
    else { ref.current?.pause(); ref.current?.reset(); }
  }, [playing]);
  useEffect(syncPlayback, [syncPlayback, key]);
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessible
      accessibilityLabel={t('familyAvatar.label', { name: profile?.displayName || t('profiles.unnamed') })}>
      {key && failedKey !== key ? (
        <LottieView key={key} ref={ref} source={SOURCES[key]} autoPlay={playing} loop resizeMode="contain"
          onAnimationLoaded={syncPlayback} onAnimationFailure={() => setFailedKey(key)}
          style={{ width: '100%', height: '100%' }} />
      ) : <Text style={{ textAlign: 'center', lineHeight: size, fontSize: size * 0.6 }}>🐱</Text>}
    </View>
  );
}
