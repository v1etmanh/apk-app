/**
 * SkyHeader — dải trời màu nước ở đầu màn, đáy cắt theo đường sóng.
 * Ảnh trời lấy theo thời tiết hiện tại (assets/textures/weather/sky-<type>.webp,
 * chưa có thời tiết → sky_watercolor.png); đổi thời tiết thì ảnh mới kéo từ trên
 * xuống. Mỗi màn (variant trong theme.BG) chỉ khác đoạn cắt ảnh, chiều lật,
 * màu nhấn nhẹ và hình sóng (seed cố định).
 *
 * Ảnh trời được CẮT theo sóng (ClipPath) thay vì vẽ một dải màu kem đè lên,
 * nên giấy nền bên dưới hiện ra liền mạch, không bị gợn ở chỗ nối.
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Defs, ClipPath, Path, G, Image as SvgImage, Rect } from 'react-native-svg';
import { BG } from '../../theme';
import {
  WEATHER_TEXTURES, VEIL_OPACITY, VEIL_RANGE, SOLID_RANGE,
  useCurrentWeatherType, useWeatherWipe,
} from './WeatherSkyBackground';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const SKY_RATIO = 1520 / 704; // cao / rộng của ảnh gốc
const WAVE_AMP = 9;           // biên độ sóng (px)
export const SKY_WAVE_SPACE = 18; // khoảng đệm đáy để sóng không đè nội dung

// Sinh đường sóng ổn định theo seed
function wavePath(seed, w, h, amp) {
  let s = (seed * 7919) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = 4 + (seed % 2);
  const base = h - amp;
  let d = `M0,0 L${w},0 L${w},${base}`;
  for (let i = n; i > 0; i--) {
    const x0 = (w * i) / n;
    const x1 = (w * (i - 1)) / n;
    const cy = base + (rnd() > 0.5 ? amp : -amp) * (0.6 + rnd() * 0.4);
    const ey = base + (rnd() - 0.5) * amp * 0.6;
    d += ` Q${(x0 + x1) / 2},${cy} ${x1},${ey}`;
  }
  return `${d} Z`;
}

export default function SkyHeader({ variant = 'home', opacity = 0.55, style, children, weatherType }) {
  const cfg = BG[variant] || BG.home;
  const current = useCurrentWeatherType();
  // Prop SVG không chạy native driver → dùng JS driver cho bản SVG
  const { base, incoming, progress } = useWeatherWipe(weatherType !== undefined ? weatherType : current, false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const clipId = `sky-${variant}`;

  const d = useMemo(
    () => (size.w && size.h ? wavePath(cfg.seed, size.w, size.h, WAVE_AMP) : null),
    [cfg.seed, size.w, size.h],
  );

  const imgH = size.w * SKY_RATIO;
  const imgY = -Math.max(0, imgH - size.h) * cfg.offset;

  const veilH  = progress.interpolate({ inputRange: VEIL_RANGE,  outputRange: [0, size.h], extrapolate: 'clamp' });
  const solidH = progress.interpolate({ inputRange: SOLID_RANGE, outputRange: [0, size.h], extrapolate: 'clamp' });

  const renderSky = (src) => (
    <SvgImage
      href={src}
      x={0}
      y={imgY}
      width={size.w}
      height={imgH}
      opacity={opacity}
      preserveAspectRatio="xMidYMid slice"
    />
  );

  return (
    <View
      style={[s.wrap, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) {
          setSize({ w: width, h: height });
        }
      }}
    >
      {d && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <ClipPath id={clipId}>
              <Path d={d} />
            </ClipPath>
            {incoming ? (
              <>
                <ClipPath id={`${clipId}-veil`}>
                  <AnimatedRect x={0} y={0} width={size.w} height={veilH} />
                </ClipPath>
                <ClipPath id={`${clipId}-solid`}>
                  <AnimatedRect x={0} y={0} width={size.w} height={solidH} />
                </ClipPath>
              </>
            ) : null}
          </Defs>
          <G clipPath={`url(#${clipId})`}>
            <G transform={cfg.flip ? `translate(${size.w},0) scale(-1,1)` : undefined}>
              {renderSky(WEATHER_TEXTURES[base])}
              {incoming ? (
                <>
                  {/* Lớp mỏng đi trước + lớp đặc theo sau → mép chuyển mềm */}
                  <G clipPath={`url(#${clipId}-veil)`} opacity={VEIL_OPACITY}>
                    {renderSky(WEATHER_TEXTURES[incoming])}
                  </G>
                  <G clipPath={`url(#${clipId}-solid)`}>
                    {renderSky(WEATHER_TEXTURES[incoming])}
                  </G>
                </>
              ) : null}
            </G>
            {cfg.tint ? (
              <Rect x={0} y={0} width={size.w} height={size.h} fill={cfg.tint} opacity={cfg.tintOpacity} />
            ) : null}
          </G>
        </Svg>
      )}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', paddingBottom: SKY_WAVE_SPACE },
});
