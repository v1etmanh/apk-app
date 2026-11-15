// Màn 1 — Thông tin cơ thể: giới tính, chiều cao, cân nặng
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import RulerPicker from '../../components/onboarding/RulerPicker';
import { ChoiceCard, SectionLabel } from '../../components/onboarding/ChoiceCard';
import { useOnboarding, useResumeOnboarding, goNext } from './OnboardingFlow';
import { C, F, R } from '../../theme';

const bmiOf = (h, w) => (h > 0 ? w / ((h / 100) ** 2) : 0);
const bmiKey = (b) => (b < 18.5 ? 'under' : b < 25 ? 'normal' : b < 30 ? 'over' : 'obese');

const OnbBody = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update } = ctx;
  useResumeOnboarding(navigation);

  const bmi = bmiOf(draft.height, draft.weight);

  return (
    <OnbLayout
      step={ctx.stepOf('OnbBody')}
      total={ctx.total}
      title={t('onboarding.body.title')}
      subtitle={t('onboarding.body.subtitle')}
      onBack={ctx.onCancel}
      backLabel={t('common.back')}
      ctaLabel={t('onboarding.next')}
      ctaDisabled={!draft.gender}
      onCta={() => goNext(ctx, navigation, 'OnbBody')}
    >
      <SectionLabel>{t('onboarding.body.gender')}</SectionLabel>
      <View style={s.genderRow}>
        <ChoiceCard compact emoji="👨" label={t('onboarding.body.male')}
          selected={draft.gender === 'male'} onPress={() => update({ gender: 'male' })} />
        <ChoiceCard compact emoji="👩" label={t('onboarding.body.female')}
          selected={draft.gender === 'female'} onPress={() => update({ gender: 'female' })} />
      </View>

      <SectionLabel>{t('onboarding.body.height')}</SectionLabel>
      <RulerPicker min={120} max={220} step={1} majorEvery={10} unit="cm"
        value={draft.height} onChange={(v) => update({ height: v })} />

      <SectionLabel>{t('onboarding.body.weight')}</SectionLabel>
      <RulerPicker min={30} max={150} step={0.5} majorEvery={5} decimals={1} unit="kg"
        value={draft.weight} onChange={(v) => update({ weight: v })} />

      <View style={s.bmiBox}>
        <Text style={s.bmiText}>
          {t('onboarding.body.bmi', { value: bmi.toFixed(1) })} · {t(`onboarding.body.bmiLevel.${bmiKey(bmi)}`)}
        </Text>
        <Text style={s.bmiHint}>{t('onboarding.body.bmiHint')}</Text>
      </View>
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  bmiBox: { backgroundColor: C.parchmentLight, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.border },
  bmiText: { fontSize: F.base, color: C.woodDark, fontFamily: 'BeVietnamPro-Bold' },
  bmiHint: { fontSize: F.sm, color: C.textLight, fontFamily: 'BeVietnamPro-Regular', marginTop: 4 },
});

export default OnbBody;
