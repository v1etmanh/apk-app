/**
 * BubbleTabButton — nút tab cho bottom tab mặc định (dùng qua `tabBarButton`).
 * Giữ nguyên icon/nhãn/màu của tab bar, chỉ thêm:
 * - Tab đang chọn: 1 bong bóng trong mờ bọc quanh, "nảy" lên khi được chọn.
 * - Nhấn: co nhẹ rồi nảy về · Hover (web): phóng nhẹ.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const POP = { useNativeDriver: true, friction: 6, tension: 140 };

export default function BubbleTabButton({ children, style, accessibilityState, onPress, onLongPress, ...rest }) {
  const focused = !!accessibilityState?.selected;
  const bubble = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const touch = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(bubble, { toValue: focused ? 1 : 0, ...POP }).start();
  }, [focused, bubble]);

  const to = (v) => Animated.spring(touch, { toValue: v, ...POP }).start();

  return (
    <AnimatedPressable
      {...rest}
      accessibilityState={accessibilityState}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => to(0.9)}
      onPressOut={() => to(1)}
      onHoverIn={() => to(1.06)}
      onHoverOut={() => to(1)}
      style={[style, { transform: [{ scale: touch }] }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          s.bubble,
          {
            opacity: bubble,
            transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />
      {children}
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  // Cùng tông với tabBarActiveTintColor (#60A5FA), rất nhạt — có mà như không
  bubble: {
    ...StyleSheet.absoluteFillObject,
    top: 4,
    bottom: 4,
    left: 6,
    right: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
  },
});
