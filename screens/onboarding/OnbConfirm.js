// Màn 5 — Xác nhận khẩu vị & bắt đầu (App.js xin quyền GPS ngay sau khi hoàn tất)
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import TasteSummaryCard from '../../components/onboarding/TasteSummaryCard';
import { MascotCat } from '../../components/ui/Mascot';
import { Pill } from '../../components/ui/Notebook';
import { regionOnlyTaste, HOME_REGION_OPTIONS, DIET_OPTIONS } from '../../services/onboardingService';
import { tasteSummary } from '../../utils/tasteMath';
import { useOnboarding } from './OnboardingFlow';
import { C, F } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

const OnbConfirm = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update, mode } = ctx;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const taste = draft.taste_weight || regionOnlyTaste(draft).taste_weight;
  const labels = t('onboarding.tastes', { returnObjects: true });
  const top = tasteSummary(taste).slice(0, 3);
  const mascotLine = top.length
    ? t('onboarding.confirm.mascotLine', { list: top.map(x => labels[x.key]).join(' · ') })
    : t('onboarding.confirm.headlineBalanced');

  // Tóm tắt hồ sơ để kiểm tra lần cuối
  const regionOpt = HOME_REGION_OPTIONS.find(o => o.key === draft.home_region);
  const dietOpt = DIET_OPTIONS.find(o => o.key === draft.diet_type);
  const avoid = [
    ...(draft.allergies || []).map(k => t(`onboarding.allergies.${k}`, { defaultValue: k })),
    ...(draft.allergy_items || []).map(i => i.name).filter(Boolean),
  ];

  const onStart = async () => {
    setSaving(true);
    try {
      await ctx.finish({ ...draft, taste_weight: taste });
    } catch (e) {
      if (__DEV__) console.warn('[OnbConfirm] save failed:', e?.message);
      setSaving(false);
      if (e.code === 'INVALID_BIRTH_YEAR') {
        navigation.navigate('OnbBody');
      } else if (e.code === 'PROFILE_LIMIT_REACHED') {
        Alert.alert(t('familyAvatar.limitTitle'), t('familyAvatar.limitBody'));
        await useAppStore.getState().loadAllProfilesAction();
      } else {
        Alert.alert(t('onboarding.confirm.saveErrorTitle'), t('onboarding.confirm.saveErrorBody'));
      }
    }
  };

  return (
    <OnbLayout
      step={ctx.stepOf('OnbConfirm')}
      total={ctx.total}
      title={t('onboarding.confirm.title')}
      onBack={() => navigation.goBack()}
      backLabel={t('common.back')}
      ctaLabel={t('onboarding.confirm.start')}
      ctaLoading={saving}
      onCta={onStart}
      mascot={false}
      hero={<MascotCat slot="celebrate" size={140} style={s.cat} />}
    >
      <Text style={s.mascotLine}>{mascotLine}</Text>
      <Text style={s.source}>
        {draft.taste_source === 'region'
          ? t('onboarding.confirm.subtitleRegion')
          : t('onboarding.confirm.subtitle')}
      </Text>

      <TasteSummaryCard
        taste={taste}
        labels={labels}
        editable={editing}
        onChange={(next) => update({ taste_weight: next })}
      />

      <TouchableOpacity onPress={() => setEditing(e => !e)} style={s.editBtn} activeOpacity={0.8}>
        <Text style={s.editText}>{editing ? t('onboarding.confirm.doneEdit') : t('onboarding.confirm.edit')}</Text>
      </TouchableOpacity>

      <View style={s.summary}>
        {draft.nation === 'vietnam' && regionOpt && draft.home_region !== 'national' && (
          <Pill label={`${regionOpt.emoji} ${t(`onboarding.region.regions.${regionOpt.key}.label`)}`} />
        )}
        {dietOpt && <Pill label={`${dietOpt.emoji} ${t(`onboarding.diet.diets.${dietOpt.key}.label`)}`} />}
        {avoid.length > 0
          ? <Pill tone="season" label={t('onboarding.confirm.avoid', { list: avoid.join(', ') })} />
          : <Pill tone="fresh" label={t('onboarding.diet.noAllergy')} />}
      </View>

      {mode === 'full' && (
        <View style={s.gpsRow}>
          <Ionicons name="location-outline" size={16} color={C.woodDark} style={{ marginTop: 1 }} />
          <Text style={s.gpsBody}>{t('onboarding.confirm.gpsShort')}</Text>
        </View>
      )}
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  cat: { alignSelf: 'center', marginBottom: 10 },
  mascotLine: { fontFamily: 'Patrick Hand', fontSize: 17, lineHeight: 23, color: '#4A3728', textAlign: 'center', marginBottom: 4 },
  source: { fontSize: 12.5, color: C.textSoft, fontFamily: 'BeVietnamPro-Regular', textAlign: 'center', marginBottom: 14 },
  editBtn: {
    alignSelf: 'flex-start', marginTop: 10, minHeight: 40, paddingHorizontal: 14, justifyContent: 'center',
    borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.woodLight,
  },
  editText: { color: C.woodDark, fontSize: F.sm, fontFamily: 'BeVietnamPro-Bold' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  gpsRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'flex-start' },
  gpsBody: { flex: 1, fontSize: 12.5, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 18 },
});

export default OnbConfirm;
