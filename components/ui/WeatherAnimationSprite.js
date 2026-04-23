import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { C } from '../../theme';

// On web, useNativeDriver causes silent failures → always false on web
const ND = Platform.OS !== 'web';

// ─── Weather type detector ────────────────────────────────────────────────────
const getWeatherType = (condition = '', icon = '') => {
  const s = (condition + icon).toLowerCase();
  if (s.includes('thunder') || s.includes('storm') || s.includes('giông') || s.includes('⛈')) return 'stormy';
  if (s.includes('snow') || s.includes('tuyết') || s.includes('❄') || s.includes('🌨')) return 'snowy';
  if (s.includes('fog') || s.includes('mist') || s.includes('sương') || s.includes('🌫')) return 'foggy';
  if (s.includes('rain') || s.includes('drizzle') || s.includes('mưa') || s.includes('🌧') || s.includes('🌦')) return 'rainy';
  if (s.includes('cloud') || s.includes('mây') || s.includes('⛅') || s.includes('🌥') || s.includes('☁')) return 'cloudy';
  if (s.includes('sun') || s.includes('clear') || s.includes('nắng') || s.includes('☀') || s.includes('🌤')) return 'sunny';
  return 'sunny';
};

// ─── Particle emitters per type ───────────────────────────────────────────────
const PARTICLE_COUNT = { rainy: 22, stormy: 30, snowy: 20 };

const initParticles = (type, W, H) => {
  if (type === 'rainy' || type === 'stormy') {
    return Array.from({ length: PARTICLE_COUNT[type] }, () => ({
      x: new Animated.ValueXY({ x: Math.random() * W, y: Math.random() * H }),
      opacity: new Animated.Value(0.2 + Math.random() * 0.5),
      delay: Math.random() * 800,
    }));
  }
  if (type === 'snowy') {
    return Array.from({ length: PARTICLE_COUNT.snowy }, () => ({
      x: new Animated.ValueXY({ x: Math.random() * W, y: -8 }),
      opacity: new Animated.Value(0.4 + Math.random() * 0.5),
      size: 2 + Math.random() * 3,
      delay: Math.random() * 2000,
    }));
  }
  return [];
};

// ─── Hook: icon animation per weather type ───────────────────────────────────
const useIconAnim = (type) => {
  const floatY  = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(1)).current;
  const rotate  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rayRot  = useRef(new Animated.Value(0)).current; // sunny only

  useEffect(() => {
    const configs = {
      sunny: [
        Animated.loop(Animated.sequence([
          Animated.timing(floatY, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(floatY, { toValue: 0,  duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
          Animated.timing(scale, { toValue: 1,    duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.timing(rayRot, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: ND })),
      ],
      rainy: [
        Animated.loop(Animated.sequence([
          Animated.timing(floatY, { toValue: -4, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(floatY, { toValue: 0,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(rotate, { toValue: 3,  duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(rotate, { toValue: -3, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
      ],
      cloudy: [
        Animated.loop(Animated.sequence([
          Animated.timing(floatY, { toValue: -8, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(floatY, { toValue: 0,  duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(rotate, { toValue: 4,  duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(rotate, { toValue: -4, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
      ],
      stormy: [
        Animated.loop(Animated.sequence([
          Animated.timing(scale, { toValue: 1.05, duration: 600,  easing: Easing.out(Easing.quad), useNativeDriver: ND }),
          Animated.timing(scale, { toValue: 1,    duration: 600,  easing: Easing.in(Easing.quad),  useNativeDriver: ND }),
          Animated.delay(1200 + Math.random() * 1000),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(rotate, { toValue: 5,  duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(rotate, { toValue: -5, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
      ],
      snowy: [
        Animated.loop(Animated.sequence([
          Animated.timing(floatY, { toValue: -5, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(floatY, { toValue: 0,  duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: ND })),
      ],
      foggy: [
        Animated.loop(Animated.sequence([
          Animated.timing(floatY,  { toValue: -4,  duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(floatY,  { toValue: 0,   duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])),
        Animated.loop(Animated.sequence([
          Animated.timing(opacity, { toValue: 0.65, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
          Animated.timing(opacity, { toValue: 1,    duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
        ])),
      ],
    };

    const anims = configs[type] || configs.sunny;
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [type]);

  const rotateDeg = rotate.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const rayDeg    = rayRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return { floatY, scale, rotateDeg, opacity, rayDeg };
};

// ─── Particle layer components ────────────────────────────────────────────────
const RainParticles = ({ count = 22, heavy = false }) => {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: `${Math.random() * 100}%`,
      anim: new Animated.Value(0),
      delay: Math.random() * 800,
      opacity: 0.25 + Math.random() * 0.45,
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const loop = () =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1,
            duration: heavy ? 500 + Math.random() * 200 : 900 + Math.random() * 400,
            easing: Easing.linear,
            useNativeDriver: ND,
          }),
        ]).start(({ finished }) => { if (finished) { p.anim.setValue(0); loop(); } });
      loop();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-10, 130] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, heavy ? 18 : 8] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              opacity: p.opacity,
              transform: [{ translateY }, { translateX }],
            }}
          >
            <View style={{
              width: heavy ? 1.5 : 1,
              height: heavy ? 10 + Math.random() * 6 : 7 + Math.random() * 5,
              backgroundColor: heavy ? 'rgba(140,180,240,0.9)' : 'rgba(150,200,255,0.85)',
              borderRadius: 1,
              transform: [{ rotate: '10deg' }],
            }} />
          </Animated.View>
        );
      })}
    </View>
  );
};

const SnowParticles = () => {
  const flakes = useRef(
    Array.from({ length: 20 }, () => ({
      x: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 3,
      anim: new Animated.Value(0),
      delay: Math.random() * 2000,
      drift: (Math.random() - 0.5) * 20,
      opacity: 0.4 + Math.random() * 0.5,
    }))
  ).current;

  useEffect(() => {
    flakes.forEach(f => {
      const loop = () =>
        Animated.sequence([
          Animated.delay(f.delay),
          Animated.timing(f.anim, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.linear,
            useNativeDriver: ND,
          }),
        ]).start(({ finished }) => { if (finished) { f.anim.setValue(0); loop(); } });
      loop();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {flakes.map((f, i) => {
        const translateY = f.anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 130] });
        const translateX = f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, f.drift] });
        const opacity    = f.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, f.opacity, f.opacity, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: f.x,
              top: 0,
              width: f.size,
              height: f.size,
              borderRadius: f.size / 2,
              backgroundColor: 'rgba(210,235,255,0.9)',
              opacity,
              transform: [{ translateY }, { translateX }],
            }}
          />
        );
      })}
    </View>
  );
};

const FogStreaks = () => {
  const streaks = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      top: 15 + i * 14 + Math.random() * 8,
      anim: new Animated.Value(0),
      delay: i * 300 + Math.random() * 400,
      width: 50 + Math.random() * 50,
      opacity: 0.08 + Math.random() * 0.1,
    }))
  ).current;

  useEffect(() => {
    streaks.forEach(s => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(s.anim, {
            toValue: 1,
            duration: 5000 + Math.random() * 3000,
            easing: Easing.linear,
            useNativeDriver: ND,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {streaks.map((s, i) => {
        const translateX = s.anim.interpolate({ inputRange: [0, 1], outputRange: [-s.width, 130] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: s.top,
              height: 4,
              width: s.width,
              borderRadius: 2,
              backgroundColor: 'rgba(180,190,210,1)',
              opacity: s.opacity,
              transform: [{ translateX }],
            }}
          />
        );
      })}
    </View>
  );
};

const SunRays = ({ rayDeg }) => (
  <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
    <Animated.View style={[s.rayContainer, { transform: [{ rotate: rayDeg }] }]}>
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={[
            s.ray,
            { transform: [{ rotate: `${i * 45}deg` }, { translateY: -42 }] },
          ]}
        />
      ))}
    </Animated.View>
  </View>
);

// ─── Lightning flash overlay ──────────────────────────────────────────────────
const LightningFlash = () => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const flash = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 60,  useNativeDriver: ND }),
        Animated.timing(opacity, { toValue: 0,    duration: 80,  useNativeDriver: ND }),
        Animated.delay(40),
        Animated.timing(opacity, { toValue: 0.2,  duration: 50,  useNativeDriver: ND }),
        Animated.timing(opacity, { toValue: 0,    duration: 120, useNativeDriver: ND }),
      ]).start(() => setTimeout(flash, 2500 + Math.random() * 3000));
    };
    const t = setTimeout(flash, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(200,220,255,1)', opacity, borderRadius: 60, pointerEvents: 'none' }]}
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const WeatherAnimationSprite = ({
  icon = '🌤️',
  temperature = '--',
  condition = 'Đang tải...',
  feelsLike = null,
}) => {
  const type = getWeatherType(condition, icon);
  const { floatY, scale, rotateDeg, opacity, rayDeg } = useIconAnim(type);

  // Ring pulse
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.22, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
          Animated.timing(ringOpacity, { toValue: 0,    duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1,   duration: 0, useNativeDriver: ND }),
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 0, useNativeDriver: ND }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={s.container}>
      <View style={s.stageArea}>
        {/* Particle effects behind icon */}
        {(type === 'rainy')  && <RainParticles count={22} heavy={false} />}
        {(type === 'stormy') && <RainParticles count={30} heavy={true} />}
        {(type === 'snowy')  && <SnowParticles />}
        {(type === 'foggy')  && <FogStreaks />}
        {(type === 'sunny')  && <SunRays rayDeg={rayDeg} />}

        {/* Aura ring */}
        <Animated.View style={[s.ringLayer, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

        {/* Icon */}
        <Animated.View
          style={[
            s.iconWrapper,
            {
              opacity,
              transform: [
                { translateY: floatY },
                { scale },
                { rotate: rotateDeg },
              ],
            },
          ]}
        >
          {type === 'stormy' && <LightningFlash />}
          <Text style={s.weatherIcon}>{icon}</Text>
        </Animated.View>
      </View>

      <View style={s.tempContainer}>
        <View style={s.tempRow}>
          <Text style={s.tempNum}>{temperature}</Text>
          <Text style={s.degreeSymbol}>°C</Text>
        </View>
        <Text style={s.condText}>{condition}</Text>
        {feelsLike && <Text style={s.feelsLike}>Cảm giác như {feelsLike}°C</Text>}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  stageArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLayer: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    width: 120, height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    // Web-safe shadow
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(255,255,255,0.15)' },
      default: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  weatherIcon: {
    fontSize: 64,
    lineHeight: 68,
    zIndex: 2,
  },
  rayContainer: {
    position: 'absolute',
    width: 120, height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: 'rgba(255,220,80,0.55)',
    borderRadius: 1,
  },
  tempContainer: { alignItems: 'center', gap: 6 },
  tempRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  tempNum: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 72, color: C.text, letterSpacing: -2, lineHeight: 78,
    // no textShadow here – avoid deprecated props on web
  },
  degreeSymbol: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 32, color: C.woodDark, marginTop: 12,
  },
  condText: {
    fontFamily: 'Caveat_700Bold',
    fontSize: 22, color: C.textMid, marginTop: 4,
  },
  feelsLike: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 16, color: C.textLight, marginTop: 6,
  },
});

export default WeatherAnimationSprite;