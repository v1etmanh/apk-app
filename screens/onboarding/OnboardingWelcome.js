import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

/* ─── DoodlePad Design Tokens ─── */
const DP = {
  primary:      '#60A5FA',
  primaryLight: '#EFF6FF',
  primaryDark:  '#3B82F6',
  secondary:    '#4ADE80',
  tertiary:     '#FBBF24',
  bg:           '#FFFFF0',
  surface:      '#FFFFFF',
  border:       '#E5E7EB',
  text:         '#1F2937',
  textMid:      '#6B7280',
  textLight:    '#9CA3AF',
};

/* ─── Decorative Blob ─── */
const Blob = ({ size, color, x, y, rotate = '0deg', opacity = 0.5 }) => (
  <View style={{
    position: 'absolute', left: x, top: y,
    width: size, height: size * 1.35,
    borderRadius: size / 2,
    backgroundColor: color,
    transform: [{ rotate }],
    opacity,
  }} />
);

/* ─── Feature Pill ─── */
const FeaturePill = ({ icon, label }) => (
  <View style={s.pill}>
    <Text style={s.pillIcon}>{icon}</Text>
    <Text style={s.pillLabel}>{label}</Text>
  </View>
);

/* ─── Floating Chip ─── */
const FloatChip = ({ icon, label, style }) => (
  <View style={[s.floatChip, style]}>
    <Text style={s.floatChipText}>{icon} {label}</Text>
  </View>
);

const OnboardingWelcome = ({ navigation }) => {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DP.bg} />

      {/* ── Hero ── */}
      <View style={s.hero}>
        <Blob size={160} color={DP.primary}   x={-40}         y={-50}  rotate="-15deg" opacity={0.15} />
        <Blob size={120} color={DP.secondary} x={width - 95}  y={-25}  rotate="25deg"  opacity={0.18} />
        <Blob size={75}  color={DP.tertiary}  x={width - 65}  y={115}  rotate="-30deg" opacity={0.25} />
        <Blob size={55}  color={DP.primary}   x={8}           y={140}  rotate="40deg"  opacity={0.15} />

        {/* Stars */}
        <Text style={[s.star, { left: 28, top: 28, fontSize: 16 }]}>⭐</Text>
        <Text style={[s.star, { right: 44, top: 48, fontSize: 22 }]}>⭐</Text>
        <Text style={[s.star, { right: 24, top: 130, fontSize: 13 }]}>✨</Text>
        <Text style={[s.star, { left: 52, top: 155, fontSize: 12 }]}>✨</Text>

        {/* Centre bowl card */}
        <View style={s.bowlCard}>
          <Text style={s.bowlEmoji}>🍜</Text>
          <View style={s.bowlBadge}>
            <Text style={s.bowlBadgeText}>🌿 Healthy</Text>
          </View>
        </View>

        {/* Floating info chips */}
        <FloatChip icon="🌤" label="Thời tiết" style={{ left: 14, bottom: 26 }} />
        <FloatChip icon="💪" label="Cá nhân hoá" style={{ right: 14, bottom: 50 }} />
      </View>

      {/* ── Content ── */}
      <View style={s.content}>
        {/* Progress */}
        <View style={s.progressRow}>
          <View style={s.dotActive} />
          <View style={s.dot} />
          <View style={s.dot} />
          <Text style={s.stepLabel}>Bước 1 / 3</Text>
        </View>

        <Text style={s.title}>Daily Mate 🎉</Text>
        <Text style={s.subtitle}>
          Gợi ý món ăn thông minh theo thời tiết,{'\n'}sức khoẻ và khẩu vị của bạn.
        </Text>

        <View style={s.pillsRow}>
          <FeaturePill icon="🌤" label="Theo thời tiết" />
          <FeaturePill icon="💪" label="Cá nhân hoá" />
          <FeaturePill icon="🛒" label="Tận dụng nguyên liệu" />
        </View>
      </View>

      {/* ── CTA ── */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={() => navigation.navigate('OnboardingPersonal')}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>Bắt đầu ngay ✨</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Mất khoảng 1 phút để thiết lập</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: DP.bg },

  /* Hero */
  hero: {
    height: 265,
    backgroundColor: DP.primaryLight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { position: 'absolute' },
  bowlCard: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: DP.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DP.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: DP.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  bowlEmoji: { fontSize: 52 },
  bowlBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: DP.tertiary,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bowlBadgeText: { fontSize: 12, fontWeight: '700', color: '#78350F' },
  floatChip: {
    position: 'absolute',
    backgroundColor: DP.surface,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: DP.primary,
    elevation: 3,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  floatChipText: { fontSize: 13, fontWeight: '600', color: DP.primary },

  /* Content */
  content:  { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dotActive: { width: 22, height: 8, borderRadius: 4, backgroundColor: DP.primary },
  dot:       { width: 8,  height: 8, borderRadius: 4, backgroundColor: DP.border },
  stepLabel: { fontSize: 13, color: DP.textLight, fontWeight: '600', marginLeft: 6 },

  title: {
    fontSize: 38,
    fontWeight: '800',
    color: DP.text,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 17,
    color: DP.textMid,
    lineHeight: 26,
    marginBottom: 24,
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DP.surface,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: DP.border,
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  pillIcon:  { fontSize: 16 },
  pillLabel: { fontSize: 14, color: DP.textMid, fontWeight: '600' },

  /* CTA */
  bottom: { paddingHorizontal: 24, paddingBottom: 36, paddingTop: 8 },
  btn: {
    backgroundColor: DP.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: DP.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
  },
  btnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  hint:    { textAlign: 'center', fontSize: 14, color: DP.textLight, marginTop: 12, fontWeight: '500' },
});

export default OnboardingWelcome;
