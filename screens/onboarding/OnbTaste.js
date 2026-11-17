// Màn 4 — Quẹt 8 flashcard món ăn để tìm khẩu vị
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import OnbLayout, { PrimaryButton } from '../../components/onboarding/OnbLayout';
import SwipeDeck from '../../components/onboarding/SwipeDeck';
import { fetchFlashcards, computeTasteProfile, regionOnlyTaste } from '../../services/onboardingService';
import { useOnboarding, useResumeOnboarding, goNext } from './OnboardingFlow';
import { C, F } from '../../theme';

const OnbTaste = ({ navigation }) => {
  const { t } = useTranslation();
  const ctx = useOnboarding();
  const { draft, update } = ctx;
  useResumeOnboarding(navigation);

  const [loading, setLoading] = useState(!draft.cards?.length);
  const [error, setError] = useState(false);
  const [computing, setComputing] = useState(false);

  const cards = draft.cards || [];
  const index = cards.findIndex(c => !draft.votes?.[c.dish_id]);
  const currentIndex = index === -1 ? cards.length : index;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const pending = ctx.cardsPromise.current;
      ctx.cardsPromise.current = null;
      const list = pending ? await pending : await fetchFlashcards(draft);
      if (!list.length) throw new Error('empty');
      update({ cards: list, votes: {} });
    } catch (e) {
      if (__DEV__) console.warn('[OnbTaste] load cards failed:', e?.message);
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.nation, draft.home_region, draft.diet_type, draft.allergies, draft.allergy_items, draft.noAllergy]);

  useEffect(() => {
    if (!draft.cards?.length) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishCards = async (finalDraft) => {
    setComputing(true);
    try {
      const res = await computeTasteProfile(finalDraft);
      update({
        taste_weight: res.taste_weight,
        taste_source: res.source,
        liked_dish_ids: res.liked_dish_ids,
        disliked_dish_ids: res.disliked_dish_ids,
      });
      goNext(ctx, navigation, 'OnbTaste');
    } finally {
      setComputing(false);
    }
  };

  const onVote = (card, vote) => {
    const votes = { ...draft.votes, [card.dish_id]: vote };
    update({ votes });
    const done = cards.every(c => votes[c.dish_id]);
    if (done) finishCards({ ...draft, votes });
  };

  const onUndo = () => {
    const prev = cards[currentIndex - 1];
    if (!prev) return;
    const votes = { ...draft.votes };
    delete votes[prev.dish_id];
    update({ votes });
  };

  const onSkip = () => {
    const res = regionOnlyTaste(draft);
    update({ taste_weight: res.taste_weight, taste_source: 'region', liked_dish_ids: [], disliked_dish_ids: [] });
    goNext(ctx, navigation, 'OnbTaste');
  };

  const labels = {
    like: t('onboarding.taste.like'),
    neutral: t('onboarding.taste.neutral'),
    dislike: t('onboarding.taste.dislike'),
    undo: t('onboarding.taste.undo'),
  };

  return (
    <OnbLayout
      step={ctx.stepOf('OnbTaste')}
      total={ctx.total}
      title={t('onboarding.taste.title')}
      subtitle={t('onboarding.taste.subtitle')}
      onBack={() => navigation.goBack()}
      backLabel={t('common.back')}
      secondaryLabel={t('onboarding.taste.skip')}
      onSecondary={onSkip}
      scroll={false}
      mascot={false}
      stepNote={cards.length && !loading && !error
        ? t('onboarding.taste.counter', { current: Math.min(currentIndex + 1, cards.length), total: cards.length })
        : null}
    >
      {loading || computing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.muted}>{computing ? t('onboarding.taste.computing') : t('onboarding.taste.loading')}</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorEmoji}>📡</Text>
          <Text style={s.muted}>{t('onboarding.taste.error')}</Text>
          <PrimaryButton label={t('common.retry')} onPress={load} style={{ alignSelf: 'stretch', marginTop: 16 }} />
        </View>
      ) : (
        <>
          <SwipeDeck cards={cards} index={currentIndex} onVote={onVote} onUndo={onUndo} labels={labels} />
          {currentIndex >= cards.length && (
            <TouchableOpacity onPress={() => finishCards(draft)} style={s.again}>
              <Text style={s.againText}>{t('onboarding.next')} →</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </OnbLayout>
  );
};

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  muted: { marginTop: 12, color: C.textMid, fontSize: F.base, fontFamily: 'BeVietnamPro-Regular', textAlign: 'center' },
  errorEmoji: { fontSize: 40 },
  counter: { textAlign: 'center', color: C.textLight, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold', marginBottom: 10 },
  again: { alignItems: 'center', marginTop: 12 },
  againText: { color: C.primary, fontSize: F.base, fontFamily: 'BeVietnamPro-Bold' },
});

export default OnbTaste;
