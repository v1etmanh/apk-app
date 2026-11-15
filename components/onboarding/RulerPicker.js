// components/onboarding/RulerPicker.js
// Thước cuộn ngang — vuốt để chọn chiều cao / cân nặng, không cần bàn phím số.
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { C, F } from '../../theme';

const TICK_W = 12;

const RulerPicker = ({ min, max, step = 1, value, onChange, unit, majorEvery = 10, decimals = 0 }) => {
  const [width, setWidth] = useState(0);
  const scrollRef = useRef(null);
  const lastValue = useRef(value);
  const count = Math.round((max - min) / step) + 1;
  const ticks = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  const toIndex = (v) => Math.round((Math.min(max, Math.max(min, v)) - min) / step);
  const toValue = (i) => Number((min + i * step).toFixed(decimals));

  // Cuộn tới giá trị ban đầu khi đã biết chiều rộng
  useEffect(() => {
    if (!width) return;
    const x = toIndex(value) * TICK_W;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x, animated: false }));
    // chỉ chạy khi layout xong
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleScroll = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / TICK_W);
    const v = toValue(Math.min(count - 1, Math.max(0, i)));
    if (v !== lastValue.current) {
      lastValue.current = v;
      onChange?.(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, onChange]);

  const majorStep = Math.max(1, Math.round(majorEvery / step));
  const pad = width / 2 - TICK_W / 2;

  return (
    <View style={s.wrap}>
      <View style={s.valueRow}>
        <Text style={s.value}>{Number(value).toFixed(decimals)}</Text>
        <Text style={s.unit}> {unit}</Text>
      </View>
      <View style={s.ruler} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_W}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: pad }}
          >
            {ticks.map((i) => {
              const major = i % majorStep === 0;
              return (
                <View key={i} style={s.tickCell}>
                  <View style={[s.tick, major ? s.tickMajor : s.tickMinor]} />
                  {major && <Text style={s.tickLabel}>{toValue(i)}</Text>}
                </View>
              );
            })}
          </ScrollView>
        )}
        <View pointerEvents="none" style={[s.indicator, { left: width / 2 - 1.5 }]} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginBottom: 22 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: 40, color: C.primary, fontFamily: 'Lora-Bold' },
  unit: { fontSize: F.lg, color: C.textMid, fontFamily: 'BeVietnamPro-SemiBold', marginBottom: 8 },
  ruler: {
    height: 72, backgroundColor: C.parchmentLight, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden', justifyContent: 'center',
  },
  tickCell: { width: TICK_W, alignItems: 'center', height: 72, paddingTop: 10 },
  tick: { width: 2, borderRadius: 1, backgroundColor: C.textLight },
  tickMinor: { height: 16, opacity: 0.5 },
  tickMajor: { height: 30 },
  tickLabel: {
    position: 'absolute', top: 44, width: 40, textAlign: 'center',
    fontSize: F.xs, color: C.textMid, fontFamily: 'BeVietnamPro-Regular',
  },
  indicator: {
    position: 'absolute', top: 4, width: 3, height: 40, borderRadius: 2, backgroundColor: C.primary,
  },
});

export default RulerPicker;
