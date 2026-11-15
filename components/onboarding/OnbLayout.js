// components/onboarding/OnbLayout.js — khung chung cho 5 màn onboarding
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { C, R, F, shadow } from '../../theme';

export const ProgressBar = ({ step, total }) => (
  <View style={s.progressRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[s.progressSeg, i < step && s.progressSegOn]} />
    ))}
  </View>
);

export const PrimaryButton = ({ label, onPress, disabled, loading, style }) => (
  <TouchableOpacity
    style={[s.cta, (disabled || loading) && s.ctaDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
  >
    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{label}</Text>}
  </TouchableOpacity>
);

const OnbLayout = ({
  step, total = 5, title, subtitle, onBack, backLabel,
  children, ctaLabel, onCta, ctaDisabled, ctaLoading,
  secondaryLabel, onSecondary, scroll = true,
}) => {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: s.bodyContent, keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false }
    : { style: [s.bodyContent, { flex: 1 }] };

  return (
    <View style={s.root}>
      <View style={s.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={12} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backText}>‹ {backLabel}</Text>
          </TouchableOpacity>
        ) : <View style={s.backBtn} />}
        <Text style={s.stepText}>{step}/{total}</Text>
      </View>
      <ProgressBar step={step} total={total} />

      <Body {...bodyProps}>
        <Text style={s.title}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        {children}
      </Body>

      {(ctaLabel || secondaryLabel) && (
        <View style={s.footer}>
          {!!ctaLabel && (
            <PrimaryButton label={ctaLabel} onPress={onCta} disabled={ctaDisabled} loading={ctaLoading} />
          )}
          {!!secondaryLabel && (
            <TouchableOpacity onPress={onSecondary} style={s.secondary} hitSlop={8}>
              <Text style={s.secondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { minWidth: 80 },
  backText: { color: C.textMid, fontSize: F.base, fontFamily: 'BeVietnamPro-SemiBold' },
  stepText: { color: C.textLight, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.parchmentDark },
  progressSegOn: { backgroundColor: C.primary },
  bodyContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  title: { fontSize: F.h2, color: C.text, fontFamily: 'Lora-Bold', marginBottom: 6 },
  subtitle: { fontSize: F.base, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginBottom: 20, lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8 },
  cta: {
    backgroundColor: C.primary, borderRadius: R.pill, paddingVertical: 15,
    alignItems: 'center', ...shadow(2),
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: F.lg, fontFamily: 'BeVietnamPro-Bold' },
  secondary: { alignItems: 'center', paddingTop: 12 },
  secondaryText: { color: C.textLight, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
});

export default OnbLayout;
