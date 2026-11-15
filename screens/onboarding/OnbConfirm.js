// Màn 5 — Xác nhận khẩu vị & bắt đầu (App.js xin quyền GPS ngay sau khi hoàn tất)
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import TasteSummaryCard from '../../components/onboarding/TasteSummaryCard';
import { regionOnlyTaste } from '../../services/onboardingService';
import { tasteSummary } from '../../utils/tasteMath';
import { useOnboarding } from './OnboardingFlow';
import { C, F, R } from '../../theme';

const OnbConfirm = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update, mode } = ctx;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const taste = draft.taste_weight || regionOnlyTaste(draft).taste_weight;
  const labels = t('onboarding.tastes', { returnObjects: true });
  const top = tasteSummary(taste).slice(0, 4);
  const headline = top.length
    ? t('onboarding.confirm.headline', { list: top.map(x => `${labels[x.key]} ${x.pct}%`).join(' • ') })
    : t('onboarding.confirm.headlineBalanced');

  const onStart = async () => {
    setSaving(true);
    try {
      await ctx.finish({ ...draft, taste_weight: taste });
    } catch (e) {
      if (__DEV__) console.warn('[OnbConfirm] save failed:', e?.message);
      Alert.alert(t('onboarding.confirm.saveErrorTitle'), t('onboarding.confirm.saveErrorBody'));
      setSaving(false);
    }
  };

  return (
    <OnbLayout
      step={ctx.stepOf('OnbConfirm')}
      total={ctx.total}
      title={t('onboarding.confirm.title')}
      subtitle={draft.taste_source === 'region'
        ? t('onboarding.confirm.subtitleRegion')
        : t('onboarding.confirm.subtitle')}
      onBack={() => navigation.goBack()}
      backLabel={t('common.back')}
      ctaLabel={t('onboarding.confirm.start')}
      ctaLoading={saving}
      onCta={onStart}
    >
      <TasteSummaryCard
        taste={taste}
        labels={labels}
        headline={editing ? null : headline}
        editable={editing}
        onChange={(next) => update({ taste_weight: next })}
      />

      <TouchableOpacity onPress={() => setEditing(e => !e)} style={s.editBtn} hitSlop={8}>
        <Text style={s.editText}>{editing ? t('onboarding.confirm.doneEdit') : t('onboarding.confirm.edit')}</Text>
      </TouchableOpacity>

      {mode === 'full' && (
        <View style={s.gpsBox}>
          <Text style={s.gpsTitle}>📍 {t('onboarding.confirm.gpsTitle')}</Text>
          <Text style={s.gpsBody}>{t('onboarding.confirm.gpsBody')}</Text>
        </View>
      )}
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  editBtn: { alignSelf: 'center', marginTop: 14, marginBottom: 18 },
  editText: { color: C.primary, fontSize: F.base, fontFamily: 'BeVietnamPro-Bold' },
  gpsBox: { backgroundColor: C.parchmentLight, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.border },
  gpsTitle: { fontSize: F.base, color: C.woodDark, fontFamily: 'BeVietnamPro-Bold', marginBottom: 4 },
  gpsBody: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 20 },
});

export default OnbConfirm;
