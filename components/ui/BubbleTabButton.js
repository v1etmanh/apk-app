/**
 * Bottom navigation motion:
 * - BubbleTabButton tạo phản hồi co/nảy khi nhấn.
 * - SlidingBubbleTabBar giữ một vòng trắng dùng chung và trượt giữa các tab.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const POP = { useNativeDriver: true, friction: 6, tension: 140 };

export default function BubbleTabButton({ children, style, accessibilityState, onPress, onLongPress, ...rest }) {
  const touch = useRef(new Animated.Value(1)).current;

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
      {children}
    </AnimatedPressable>
  );
}

export function SlidingBubbleTabBar(props) {
  const { width } = useWindowDimensions();
  const { state } = props;
  const position = useRef(new Animated.Value(state.index)).current;
  const itemWidth = width / state.routes.length;

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      friction: 10,
      tension: 58,
    }).start();
  }, [position, state.index]);

  return (
    <View style={s.barShell}>
      <Animated.View
        pointerEvents="none"
        style={[
          s.bubble,
          {
            left: itemWidth / 2 - 30,
            transform: [{ translateX: Animated.multiply(position, itemWidth) }],
          },
        ]}
      />
      <BottomTabBar {...props} />
    </View>
  );
}

const s = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 0,
    top: 1,
    width: 60,
    height: 53,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  barShell: {
    position: 'relative',
    backgroundColor: '#F5EDDC',
    borderTopColor: '#C8A96E',
    borderTopWidth: 1.5,
  },
});
