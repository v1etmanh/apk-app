/**
 * WeatherSkyBackground — nền trời đổi texture theo thời tiết.
 *
 * Ánh xạ: assets/textures/weather/sky-<type>.webp
 *   sunny | cloudy | rainy | stormy | snowy | foggy
 * Chưa có thời tiết (weatherType = null) → dùng sky_watercolor.png mặc định.
 *
 * Khi weatherType đổi, texture mới "kéo" xuống từ mép trên như tấm màn:
 *  - lớp mỏng (veil, ~45% opacity) đi trước → tạo mép chuyển mềm
 *  - lớp đặc theo sau, phủ kín texture mới
 * Dùng kỹ thuật counter-translate (khung trượt xuống, ảnh trượt ngược lên)
 * nên ảnh đứng yên trên màn hình và chạy được native driver.
 *
 * Export thêm:
 *  - useWeatherWipe(target, useNative) — logic chuyển cảnh dùng chung (SkyHeader dùng bản SVG)
 *  - useCurrentWeatherType()            — nhóm thời tiết hiện tại từ store
 *  - WeatherImageBackground             — thay ImageBackground cho header các màn
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Platform, Dimensions } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { weatherTypeFromData } from '../../utils/weatherText';

const ND = Platform.OS !== 'web';
export const WIPE_DURATION = 1600;
export const VEIL_OPACITY = 0.45;
// Khoảng progress của 2 lớp: veil đi trước, lớp đặc theo sau
export const VEIL_RANGE = [0, 0.8];
export const SOLID_RANGE = [0.2, 1];

export const WEATHER_TEXTURES = {
  default: require('../../assets/textures/sky_watercolor.png'),
  sunny:   require('../../assets/textures/weather/sky-sunny.webp'),
  cloudy:  require('../../assets/textures/weather/sky-cloudy.webp'),
  rainy:   require('../../assets/textures/weather/sky-rainy.webp'),
  stormy:  require('../../assets/textures/weather/sky-stormy.webp'),
  snowy:   require('../../assets/textures/weather/sky-snowy.webp'),
  foggy:   require('../../assets/textures/weather/sky-foggy.webp'),
};

export const textureKey = (t) => (t && WEATHER_TEXTURES[t] ? t : 'default');

export function useCurrentWeatherType() {
  return useAppStore((st) => weatherTypeFromData(st.weatherData));
}

/**
 * Quản lý chuyển texture: trả về { base, incoming, progress }.
 * progress chạy 0 → 1 trong lúc incoming đang kéo xuống, xong thì incoming thành base.
 */
export function useWeatherWipe(weatherType, useNative = ND) {
  const target = textureKey(weatherType);
  const [base, setBase] = useState(target);
  const [incoming, setIncoming] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const incomingRef = useRef(null);
  const baseRef = useRef(target);

  useEffect(() => {
    // Đổi thời tiết giữa chừng → chốt texture đang chạy làm nền rồi chạy tiếp
    let currentBase = baseRef.current;
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
      if (incomingRef.current) currentBase = incomingRef.current;
    }
    baseRef.current = currentBase;
    setBase(currentBase);

    if (target === currentBase) {
      incomingRef.current = null;
      setIncoming(null);
      return;
    }

    incomingRef.current = target;
    setIncoming(target);
    progress.setValue(0);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: WIPE_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: useNative,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (!finished) return;
      animRef.current = null;
      incomingRef.current = null;
      baseRef.current = target;
      setBase(target);
      setIncoming(null);
      progress.setValue(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => animRef.current?.stop(), []);

  return { base, incoming, progress };
}

// Một lớp texture được "kéo" từ trên xuống theo progress trong `range`
const WipeLayer = ({ source, progress, height, range, opacity = 1 }) => {
  const clipY  = progress.interpolate({ inputRange: range, outputRange: [-height, 0], extrapolate: 'clamp' });
  const imageY = progress.interpolate({ inputRange: range, outputRange: [height, 0],  extrapolate: 'clamp' });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.clip, { opacity, transform: [{ translateY: clipY }] }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: imageY }] }]}>
        <Image source={source} style={s.img} resizeMode="cover" />
      </Animated.View>
    </Animated.View>
  );
};

export default function WeatherSkyBackground({ weatherType = null, style, imageOpacity = 1 }) {
  const { base, incoming, progress } = useWeatherWipe(weatherType);
  const [height, setHeight] = useState(Dimensions.get('window').height);

  return (
    <View
      style={[StyleSheet.absoluteFill, s.root, { opacity: imageOpacity }, style]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - height) > 1) setHeight(h);
      }}
    >
      <Image source={WEATHER_TEXTURES[base]} style={s.img} resizeMode="cover" />
      {incoming && (
        <>
          <WipeLayer
            source={WEATHER_TEXTURES[incoming]}
            progress={progress}
            height={height}
            range={VEIL_RANGE}
            opacity={VEIL_OPACITY}
          />
          <WipeLayer
            source={WEATHER_TEXTURES[incoming]}
            progress={progress}
            height={height}
            range={SOLID_RANGE}
          />
        </>
      )}
    </View>
  );
}

/**
 * Thay thế ImageBackground(sky_watercolor) ở header các màn:
 * tự lấy thời tiết hiện tại từ store, đổi texture + kéo từ trên xuống.
 */
export function WeatherImageBackground({ style, imageOpacity = 1, weatherType, children }) {
  const current = useCurrentWeatherType();
  const type = weatherType !== undefined ? weatherType : current;
  return (
    <View style={[s.wrap, style]}>
      <WeatherSkyBackground weatherType={type} imageOpacity={imageOpacity} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { overflow: 'hidden', pointerEvents: 'none' },
  wrap: { position: 'relative' },
  clip: { overflow: 'hidden' },
  img: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
