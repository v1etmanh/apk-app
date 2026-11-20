// Màn 1 — Năm sinh, giới tính, mèo theo nhóm tuổi và chỉ số cơ thể.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import RulerPicker from '../../components/onboarding/RulerPicker';
import { ChoiceCard, SectionLabel } from '../../components/onboarding/ChoiceCard';
import { useOnboarding, useResumeOnboarding, goNext } from './OnboardingFlow';
import { C, F, R } from '../../theme';
import BirthYearField from '../../components/BirthYearField';
import { useProfileYear } from '../../components/ui/ProfileAvatar';
import ProfileAgePreview from '../../components/onboarding/ProfileAgePreview';
import { getProfileAge } from '../../utils/profileIdentity';

const bmiOf = (h, w) => (h > 0 ? w / ((h / 100) ** 2) : 0);
const bmiKey = (b) => (b < 18.5 ? 'under' : b < 25 ? 'normal' : b < 30 ? 'over' : 'obese');

const OnbBody = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update } = ctx;
  const year = useProfileYear();
  const age = getProfileAge(draft, year);
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
      ctaDisabled={!['male', 'female'].includes(draft.gender) || age === null}
      onCta={() => goNext(ctx, navigation, 'OnbBody')}
    >
      <SectionLabel>{t('onboarding.body.gender')}</SectionLabel>
      <View style={s.genderRow}>
        <ChoiceCard compact emoji="👨" label={t('onboarding.body.male')}
          selected={draft.gender === 'male'} onPress={() => update({ gender: 'male' })} />
        <ChoiceCard compact emoji="👩" label={t('onboarding.body.female')}
          selected={draft.gender === 'female'} onPress={() => update({ gender: 'female' })} />
      </View>

      <BirthYearField value={draft.birth_year} onChange={birth_year => update({ birth_year })} />
      <ProfileAgePreview profile={draft} year={year} />

      <SectionLabel>{t('onboarding.body.height')}</SectionLabel>
      <RulerPicker min={30} max={220} step={1} majorEvery={10} unit="cm"
        value={draft.height} onChange={(v) => update({ height: v })} />

      <SectionLabel>{t('onboarding.body.weight')}</SectionLabel>
      <RulerPicker min={1} max={150} step={0.5} majorEvery={5} decimals={1} unit="kg"
        value={draft.weight} onChange={(v) => update({ weight: v })} />

      {age !== null && age >= 18 && <View style={s.bmiRow}>
        <View style={[s.bmiPill, bmiKey(bmi) !== 'normal' && { backgroundColor: C.chipBg }]}>
          <Text style={[s.bmiText, bmiKey(bmi) !== 'normal' && { color: C.textMid }]}>
            {t('onboarding.body.bmi', { value: bmi.toFixed(1) })} · {t(`onboarding.body.bmiLevel.${bmiKey(bmi)}`)}
          </Text>
        </View>
        <Text style={s.bmiHint}>{t('onboarding.body.bmiHint')}</Text>
      </View>}
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  bmiPill: { backgroundColor: C.freshBg, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  bmiText: { fontSize: F.sm, color: C.freshText, fontFamily: 'BeVietnamPro-Bold' },
  bmiHint: { flex: 1, fontSize: 12, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 17 },
});

export default OnbBody;
