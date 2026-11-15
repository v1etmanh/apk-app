// Màn 3 — Chế độ ăn & dị ứng
// Chọn một nhóm dị ứng → hỏi "hầu hết" hay "chỉ một số loại" → (một số) chọn nguyên liệu cụ thể.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout from '../../components/onboarding/OnbLayout';
import { ChoiceCard, Chip, SectionLabel } from '../../components/onboarding/ChoiceCard';
import AllergyScopeSheet from '../../components/onboarding/AllergyScopeSheet';
import { ALLERGY_OPTIONS, DIET_OPTIONS } from '../../services/onboardingService';
import { useOnboarding, useResumeOnboarding, goNext } from './OnboardingFlow';
import { C, F, R } from '../../theme';

const OnbDiet = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update } = ctx;
  useResumeOnboarding(navigation);
  const [sheetGroup, setSheetGroup] = useState(null);

  const items = draft.allergy_items || [];
  const itemsOf = (group) => items.filter(i => i.group === group);
  const otherItems = items.filter(i => !i.group || !ALLERGY_OPTIONS.some(o => o.key === i.group));
  const scopeOf = (group) => (draft.allergies.includes(group) ? 'all' : itemsOf(group).length ? 'some' : null);

  const onScopeSubmit = ({ scope, items: picked }) => {
    const group = sheetGroup;
    const groups = new Set(draft.allergies);
    groups.delete(group);
    let nextItems = items.filter(i => i.group !== group);
    if (scope === 'all') groups.add(group);
    if (scope === 'some') nextItems = [...nextItems, ...picked.map(p => ({ ...p, group }))];
    update({ allergies: [...groups], allergy_items: nextItems, noAllergy: false });
    setSheetGroup(null);
  };

  const removeOtherItem = (id) => update({ allergy_items: items.filter(i => i.id !== id) });

  const hasAny = draft.allergies.length > 0 || items.length > 0;
  const canNext = draft.noAllergy || hasAny;

  const onNext = () => {
    // Kết quả Màn 2 + 3 quyết định bộ 8 thẻ → tải trước để Màn 4 mở ra có thẻ ngay.
    // Bộ thẻ cũ (nếu có) bị xoá vì có thể không còn hợp chế độ ăn / dị ứng mới.
    update({ cards: [], votes: {}, taste_weight: null });
    ctx.prefetchCards(draft);
    goNext(ctx, navigation, 'OnbDiet');
  };

  const sheetOption = ALLERGY_OPTIONS.find(o => o.key === sheetGroup);

  return (
    <OnbLayout
      step={ctx.stepOf('OnbDiet')}
      total={ctx.total}
      title={t('onboarding.diet.title')}
      subtitle={t('onboarding.diet.subtitle')}
      onBack={() => navigation.goBack()}
      backLabel={t('common.back')}
      ctaLabel={t('onboarding.next')}
      ctaDisabled={!canNext}
      onCta={onNext}
    >
      <SectionLabel>{t('onboarding.diet.dietLabel')}</SectionLabel>
      {DIET_OPTIONS.map(o => (
        <ChoiceCard key={o.key} emoji={o.emoji}
          label={t(`onboarding.diet.diets.${o.key}.label`)}
          description={t(`onboarding.diet.diets.${o.key}.desc`)}
          selected={draft.diet_type === o.key}
          onPress={() => update({ diet_type: o.key })} />
      ))}

      <SectionLabel>{t('onboarding.diet.allergyLabel')}</SectionLabel>
      <Text style={s.hint}>{t('onboarding.allergyScope.chipHint')}</Text>
      <View style={s.chips}>
        <Chip emoji="✅" label={t('onboarding.diet.noAllergy')} selected={draft.noAllergy}
          onPress={() => update({ noAllergy: !draft.noAllergy, allergies: [], allergy_items: [] })} />
        {ALLERGY_OPTIONS.map(o => {
          const scope = scopeOf(o.key);
          const n = itemsOf(o.key).length;
          const label = t(`onboarding.allergies.${o.key}`)
            + (scope === 'some' ? ` · ${t('onboarding.allergyScope.countShort', { count: n })}` : '');
          return (
            <Chip key={o.key} emoji={o.emoji} label={label} selected={!!scope}
              onPress={() => setSheetGroup(o.key)} />
          );
        })}
      </View>

      {otherItems.length > 0 && (
        <View style={s.otherBox}>
          <Text style={s.otherTitle}>{t('onboarding.allergyScope.otherItems')}</Text>
          <View style={s.otherRow}>
            {otherItems.map(i => (
              <TouchableOpacity key={i.id} style={s.otherChip} onPress={() => removeOtherItem(i.id)}>
                <Text style={s.otherChipText}>{i.name}  ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <AllergyScopeSheet
        group={sheetGroup}
        emoji={sheetOption?.emoji}
        initialScope={sheetGroup ? scopeOf(sheetGroup) : null}
        initialIds={sheetGroup ? itemsOf(sheetGroup) : []}
        onSubmit={onScopeSubmit}
        onClose={() => setSheetGroup(null)}
      />
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  hint: { fontSize: F.sm, color: C.textLight, fontFamily: 'BeVietnamPro-Regular', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  otherBox: { marginTop: 16, padding: 12, borderRadius: R.lg, backgroundColor: C.parchmentLight, borderWidth: 1, borderColor: C.border },
  otherTitle: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-SemiBold', marginBottom: 8 },
  otherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  otherChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  otherChipText: { fontSize: F.sm, color: C.text, fontFamily: 'BeVietnamPro-Regular' },
});

export default OnbDiet;
