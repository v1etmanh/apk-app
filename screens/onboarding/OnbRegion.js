// Màn 2 — Quốc gia & vùng miền
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import { ChoiceCard, SectionLabel } from '../../components/onboarding/ChoiceCard';
import { HOME_REGION_OPTIONS, NATION_OPTIONS } from '../../services/onboardingService';
import { useOnboarding, useResumeOnboarding, goNext } from './OnboardingFlow';

const OnbRegion = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update, mode } = ctx;
  useResumeOnboarding(navigation);

  const isVN = draft.nation === 'vietnam';
  const canNext = !isVN || !!draft.home_region;

  const onNext = () => {
    // Chế độ "taste": màn kế tiếp là flashcard → tải trước bộ thẻ
    if (mode === 'taste') {
      update({ cards: [], votes: {}, taste_weight: null });
      ctx.prefetchCards(draft);
    }
    goNext(ctx, navigation, 'OnbRegion');
  };

  const onBack = navigation.canGoBack() ? () => navigation.goBack() : ctx.onCancel;

  return (
    <OnbLayout
      step={ctx.stepOf('OnbRegion')}
      total={ctx.total}
      title={t('onboarding.region.title')}
      subtitle={t('onboarding.region.subtitle')}
      onBack={onBack}
      backLabel={t('common.back')}
      ctaLabel={t('onboarding.next')}
      ctaDisabled={!canNext}
      onCta={onNext}
    >
      <SectionLabel>{t('onboarding.region.nation')}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
        {NATION_OPTIONS.map(o => (
          <ChoiceCard key={o.key} compact emoji={o.emoji} label={t(`onboarding.region.nations.${o.key}`)}
            selected={draft.nation === o.key}
            onPress={() => update({ nation: o.key, home_region: o.key === 'vietnam' ? draft.home_region : 'national' })} />
        ))}
      </View>

      {isVN && (
        <>
          <SectionLabel>{t('onboarding.region.question')}</SectionLabel>
          {HOME_REGION_OPTIONS.map(o => (
            <ChoiceCard key={o.key} emoji={o.emoji}
              label={t(`onboarding.region.regions.${o.key}.label`)}
              description={t(`onboarding.region.regions.${o.key}.desc`)}
              selected={draft.home_region === o.key}
              onPress={() => update({ home_region: o.key })} />
          ))}
        </>
      )}
    </OnbLayout>
  );
};

export default OnbRegion;
