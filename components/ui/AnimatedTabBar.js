/**
 * AnimatedTabBar — thanh điều hướng 5 tab dạng thẻ giấy bo góc.
 * - Pill nâu trượt sang tab mới (spring, có độ nảy)
 * - Icon Phosphor: tab đang chọn "fill", còn lại "regular"; icon nhích lên + phóng nhẹ
 * - Nhãn chỉ hiện ở tab đang chọn
 * Chỉ dùng Animated của RN (useNativeDriver) — không cần Reanimated.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { House } from 'phosphor-react-native/lib/module/icons/House';
import { BowlFood } from 'phosphor-react-native/lib/module/icons/BowlFood';
import { CalendarCheck } from 'phosphor-react-native/lib/module/icons/CalendarCheck';
import { UserCircle } from 'phosphor-react-native/lib/module/icons/UserCircle';
import { GearSix } from 'phosphor-react-native/lib/module/icons/GearSix';

const ICONS = {
  Home: House,
  ChosenDish: BowlFood,
  History: CalendarCheck,
  Profile: UserCircle,
  Settings: GearSix,
};

const COL = {
  barBg: '#FFFAF0',
  barBorder: '#E4D3B0',
  strip: '#F5EDDC',
  pill: '#5C3A1E',
  on: '#FFF8EA',
  off: '#8B7355',
};

const BAR_H = 60;
const PILL_INSET = 4;

const SPRING = { useNativeDriver: true, friction: 7, tension: 90 };

function TabItem({ route, focused, label, onPress, onLongPress }) {
  const prog = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(prog, { toValue: focused ? 1 : 0, ...SPRING }).start();
  }, [focused, prog]);

  const Icon = ICONS[route.name] || House;
  const iconStyle = {
    transform: [
      { translateY: prog.interpolate({ inputRange: [0, 1], outputRange: [7, -1] }) },
      { scale: prog.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
    ],
  };
  const labelStyle = {
    opacity: prog,
    transform: [{ translateY: prog.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={s.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Animated.View style={iconStyle}>
        <Icon size={23} weight={focused ? 'fill' : 'regular'} color={focused ? COL.on : COL.off} />
      </Animated.View>
      <Animated.Text style={[s.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation, insets }) {
  const [barW, setBarW] = useState(0);
  const n = state.routes.length;
  const tabW = barW / n;
  const x = useRef(new Animated.Value(0)).current;
  const ready = useRef(false);

  useEffect(() => {
    if (!tabW) return;
    const to = state.index * tabW;
    if (!ready.current) {
      x.setValue(to);
      ready.current = true;
    } else {
      Animated.spring(x, { toValue: to, ...SPRING }).start();
    }
  }, [state.index, tabW, x]);

  // Ẩn tab bar nếu màn con yêu cầu (tabBarStyle: { display: 'none' })
  const focusedOptions = descriptors[state.routes[state.index].key]?.options || {};
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  return (
    <View style={[s.strip, { paddingBottom: Math.max(insets?.bottom || 0, 8) }]}>
      <View
        style={s.bar}
        accessibilityRole="tablist"
        onLayout={(e) => setBarW(e.nativeEvent.layout.width - 2)}
      >
        {tabW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[s.pill, { width: tabW - PILL_INSET * 2, transform: [{ translateX: x }] }]}
          />
        )}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
          const focused = state.index === i;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <TabItem
              key={route.key}
              route={route}
              focused={focused}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  strip: {
    backgroundColor: COL.strip,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  bar: {
    flexDirection: 'row',
    height: BAR_H,
    borderRadius: 22,
    backgroundColor: COL.barBg,
    borderWidth: 1,
    borderColor: COL.barBorder,
    ...Platform.select({
      ios: { shadowColor: '#5C3A1E', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  pill: {
    position: 'absolute',
    top: PILL_INSET,
    left: PILL_INSET,
    height: BAR_H - 2 - PILL_INSET * 2,
    borderRadius: 17,
    backgroundColor: COL.pill,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 1,
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 10.5,
    color: COL.on,
  },
});
