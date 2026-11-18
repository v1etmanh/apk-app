// components/onboarding/OnbLayout.js — khung chung cho 5 màn onboarding
// Phong cách "sổ tay bếp": thanh tiến trình gỗ, mèo đọc phụ đề trong bóng thoại, nút gỗ ở chân màn.
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, F, shadow } from '../../theme';
import { MascotSays } from '../ui/Mascot';
import { CircleButton } from '../ui/Notebook';
import WoodButton from '../ui/WoodButton';

const WOOD = require('../../assets/textures/wood_light.png');

export const ProgressBar = ({ step, total }) => (
  <View style={s.progressRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[s.progressSeg, i < step && s.progressSegOn]} />
    ))}
  </View>
);

/** Nút gỗ (cùng kiểu WoodButton) có trạng thái loading. */
export const PrimaryButton = ({ label, onPress, disabled, loading, style }) => (
  <WoodButton title={label} onPress={onPress} disabled={disabled} loading={loading} style={style} />
);

/**
 * hero:   nội dung đặt trên tiêu đề (vd. mèo ăn mừng ở màn cuối)
 * mascot: true  → subtitle được mèo nói trong bóng thoại (slot `onboarding`, 88×88)
 *         false → subtitle là dòng chữ thường (màn đã có mèo riêng: thẻ khẩu vị, xác nhận)
 */
const OnbLayout = ({
  step, total = 5, title, subtitle, onBack, backLabel,
  children, ctaLabel, onCta, ctaDisabled, ctaLoading,
  secondaryLabel, onSecondary, scroll = true, mascot = true, stepNote, hero,
}) => {
  const { t } = useTranslation();
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: s.bodyContent, keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false }
    : { style: [s.bodyContent, { flex: 1 }] };
  return (
    <View style={s.root}>
      <View style={s.header}>
        {onBack ? (
          <CircleButton onPress={onBack} label={backLabel} />
        ) : <View style={{ width: 44 }} />}
        <Text style={s.stepText}>
          {t('onboarding.stepOf', { step, total })}{stepNote ? ` · ${stepNote}` : ''}
        </Text>
      </View>
      <ProgressBar step={step} total={total} />
      <Body {...bodyProps}>
        {hero}
        <Text style={[s.title, !!hero && { textAlign: 'center' }]}>{title}</Text>
        {!!subtitle && (mascot
          ? <MascotSays slot="onboarding" size={88} text={subtitle} style={s.mascot} />
          : <Text style={s.subtitle}>{subtitle}</Text>)}
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
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
  },
  stepText: { color: C.textSoft, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20 },
  progressSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.parchmentDark },
  progressSegOn: { backgroundColor: C.primary },
  bodyContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
  title: { fontSize: F.h2, color: C.text, fontFamily: 'Lora-Bold', marginBottom: 12, lineHeight: 31 },
  subtitle: { fontSize: F.base, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginBottom: 16, lineHeight: 22 },
  mascot: { marginBottom: 18 },
  footer: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.parchmentDark },
  cta: {
    borderRadius: 22, overflow: 'hidden', minHeight: 48,
    borderWidth: 1.5, borderColor: 'rgba(160,120,74,0.5)', ...shadow(3),
  },
  ctaImg: { borderRadius: 22, opacity: 0.8 },
  ctaInner: {
    backgroundColor: 'rgba(92,58,30,0.72)', paddingVertical: 15, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: F.lg - 1, fontFamily: 'BeVietnamPro-Bold' },
  secondary: { alignItems: 'center', paddingTop: 12, minHeight: 36, justifyContent: 'center' },
  secondaryText: { color: C.textMid, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold', textDecorationLine: 'underline' },
});

export default OnbLayout;
