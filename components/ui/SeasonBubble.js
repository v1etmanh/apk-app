import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { C } from '../../theme';

const SEASONS = {
  summer: { emoji: '🌞', label: 'Mùa hè',    tint: 'rgba(255,200,90,0.20)' },
  winter: { emoji: '❄️', label: 'Mùa đông',  tint: 'rgba(140,190,255,0.22)' },
  spring: { emoji: '🌸', label: 'Mùa xuân',  tint: 'rgba(255,170,200,0.22)' },
  autumn: { emoji: '🍂', label: 'Mùa thu',   tint: 'rgba(230,150,80,0.20)' },
};

// Lặp vô hạn 0 → 1 → 0 với easing mềm
const loop = (value, duration, delay = 0) =>
  Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]),
  );

// Mọi kích thước vẽ cho bong bóng 96px, rồi nhân theo tỉ lệ k
const makeStyles = (size) => {
  const k = size / 96;
  const ring = size - 6 * k;
  return StyleSheet.create({
    bubble: {
      width: size, height: size, borderRadius: size / 2,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
      overflow: 'hidden',
      shadowColor: '#6B8CB8',
      shadowOffset: { width: 0, height: 6 * k },
      shadowOpacity: 0.18,
      shadowRadius: 10 * k,
      elevation: 3,
    },
    ring: { position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, borderWidth: 2 * k },
    ringPink: { top: 1 * k, left: 3 * k, borderColor: 'rgba(255,160,210,0.35)' },
    ringBlue: { top: 4 * k, left: 1 * k, borderColor: 'rgba(130,200,255,0.35)' },
    shine: {
      position: 'absolute', top: 12 * k, left: 16 * k,
      width: 26 * k, height: 13 * k, borderRadius: 10 * k,
      backgroundColor: 'rgba(255,255,255,0.85)',
      transform: [{ rotate: '-35deg' }],
    },
    shineSmall: {
      position: 'absolute', top: 30 * k, left: 12 * k,
      width: 6 * k, height: 6 * k, borderRadius: 3 * k,
      backgroundColor: 'rgba(255,255,255,0.75)',
    },
    shineBottom: {
      position: 'absolute', bottom: 12 * k, right: 16 * k,
      width: 18 * k, height: 6 * k, borderRadius: 4 * k,
      backgroundColor: 'rgba(255,255,255,0.4)',
      transform: [{ rotate: '-35deg' }],
    },
    emoji: { fontSize: 26 * k },
    label: {
      fontFamily: 'Caveat_700Bold',
      fontSize: Math.max(13, 17 * k),
      color: C.textMid,
      marginTop: 2 * k,
    },
  });
};

/** Bong bóng xà phòng bồng bềnh hiển thị mùa hiện tại. */
export default function SeasonBubble({ season, size = 96, style }) {
  const info = SEASONS[season] || SEASONS.autumn;
  const st = useMemo(() => makeStyles(size), [size]);

  const bob    = useRef(new Animated.Value(0)).current; // lên xuống
  const sway   = useRef(new Animated.Value(0)).current; // trái phải
  const wobble = useRef(new Animated.Value(0)).current; // phồng xẹp nhẹ

  useEffect(() => {
    const anims = [loop(bob, 2200), loop(sway, 3400, 300), loop(wobble, 1700, 150)];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [bob, sway, wobble]);

  const k = size / 96;
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [4 * k, -8 * k] });
  const translateX = sway.interpolate({ inputRange: [0, 1], outputRange: [-6 * k, 6 * k] });
  const rotate     = sway.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const scaleX     = wobble.interpolate({ inputRange: [0, 1], outputRange: [1.03, 0.97] });
  const scaleY     = wobble.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });

  return (
    <Animated.View
      style={[style, { transform: [{ translateY }, { translateX }, { rotate }, { scaleX }, { scaleY }] }]}
      accessibilityRole="text"
      accessibilityLabel={info.label}
    >
      <View style={[st.bubble, { backgroundColor: info.tint }]}>
        {/* Viền cầu vồng */}
        <View style={[st.ring, st.ringPink]} />
        <View style={[st.ring, st.ringBlue]} />
        {/* Đốm sáng */}
        <View style={st.shine} />
        <View style={st.shineSmall} />
        <View style={st.shineBottom} />

        <Text style={st.emoji}>{info.emoji}</Text>
        <Text style={st.label}>{info.label}</Text>
      </View>
    </Animated.View>
  );
}
