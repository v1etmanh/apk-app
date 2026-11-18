// Nút tông Ghibli: gỗ (chính) · mây (phụ) · trời (nhấn nhẹ).
// Gradient dọc + gờ đáy đậm như tấm gỗ vẽ tay; khi bấm nút "lún" xuống 2px.
import React from 'react';
import { Pressable, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BTN, shadow } from '../../theme';

const LIP = 4;

export default function WoodButton({
  onPress,
  title,
  icon,
  style,
  textStyle,
  disabled = false,
  loading = false,
  isLoading,
  accessibilityLabel,
  variant = 'wood', // 'wood' | 'cloud' | 'sky'  ('ocean' = 'sky', giữ tương thích)
  size = 'md',      // 'md' | 'sm'
}) {
  const busy = loading || isLoading;
  const off = disabled || busy;
  const key = variant === 'ocean' ? 'sky' : variant;
  const p = disabled ? BTN.off : (BTN[key] || BTN.wood);
  const sm = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: off, busy: !!busy }}
      style={[{ minHeight: sm ? 40 : 52 }, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            st.lip,
            { backgroundColor: p.lip, borderRadius: sm ? 18 : 22, paddingBottom: pressed ? LIP - 2 : LIP, marginTop: pressed ? 2 : 0 },
            !disabled && key === 'wood' && shadow(2),
          ]}
        >
          <LinearGradient
            colors={[p.top, p.bottom]}
            style={[st.face, { borderColor: p.border, borderRadius: sm ? 18 : 22 }, sm && st.faceSm]}
          >
            {/* vệt sáng mảnh phía trên — cảm giác mặt gỗ/mây được nắng chiếu */}
            <View pointerEvents="none" style={[st.shine, { borderRadius: sm ? 16 : 20 }]} />
            {busy ? (
              <ActivityIndicator color={p.text} />
            ) : (
              <>
                {icon && <View style={st.icon}>{icon}</View>}
                <Text style={[st.text, sm && st.textSm, { color: p.text }, textStyle]} numberOfLines={1}>{title}</Text>
              </>
            )}
          </LinearGradient>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  lip: { overflow: 'hidden' },
  face: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1.5,
  },
  faceSm: { minHeight: 36, paddingVertical: 7, paddingHorizontal: 14 },
  shine: {
    position: 'absolute', top: 2, left: 10, right: 10, height: '40%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  icon: { marginRight: 2 },
  text: { fontSize: 16, fontFamily: 'BeVietnamPro-Bold', letterSpacing: 0.2, flexShrink: 1, textAlign: 'center' },
  textSm: { fontSize: 13.5 },
});
