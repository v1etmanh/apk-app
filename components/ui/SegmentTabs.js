/**
 * SegmentTabs — tab dạng "segmented" dùng chung (Chi tiết món, Hồ sơ, Bước nấu).
 * Ô trắng viền giấy trượt sang tab mới bằng spring (useNativeDriver).
 *
 * items: [{ key, label, icon?: (color) => ReactNode }]
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { C, shadow } from '../../theme';

const PAD = 3;

export default function SegmentTabs({ items, value, onChange, style }) {
  const [w, setW] = useState(0);
  const n = items.length;
  const itemW = w ? (w - PAD * 2) / n : 0;
  const x = useRef(new Animated.Value(0)).current;
  const ready = useRef(false);

  useEffect(() => {
    if (!itemW) return;
    const to = value * itemW;
    if (!ready.current) {
      x.setValue(to);
      ready.current = true;
    } else {
      Animated.spring(x, { toValue: to, useNativeDriver: true, friction: 8, tension: 110 }).start();
    }
  }, [value, itemW, x]);

  return (
    <View
      style={[s.wrap, style]}
      accessibilityRole="tablist"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {itemW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[s.indicator, { width: itemW, transform: [{ translateX: x }] }]}
        />
      )}
      {items.map((it, i) => {
        const on = value === i;
        const color = on ? C.primary : C.textSoft;
        return (
          <Pressable
            key={it.key}
            style={s.item}
            onPress={() => !on && onChange(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.label}
          >
            {it.icon ? it.icon(color, on) : null}
            <Text style={[s.text, on && s.textOn]} numberOfLines={1}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bọc nội dung tab: mỗi khi `id` đổi thì hiện dần + trượt nhẹ lên. */
export function TabPanel({ id, children, style }) {
  const a = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [id, a]);
  return (
    <Animated.View
      style={[style, {
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }]}
    >
      {children}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239,230,210,0.92)',
    borderRadius: 14,
    padding: PAD,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.paperStroke,
    ...shadow(1),
  },
  item: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  text: { fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: C.textSoft, flexShrink: 1 },
  textOn: { fontFamily: 'BeVietnamPro-SemiBold', color: C.text },
});
