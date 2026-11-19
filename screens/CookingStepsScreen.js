/**
 * CookingStepsScreen.js — Màn hình hướng dẫn các bước nấu ăn chi tiết
 * Tích hợp endpoint: GET /api/v1/dishes/{dish_id}/cooking-steps
 * Phong cách thiết kế: Ghibli Handcrafted / Sổ tay nấu ăn (design.md & theme.js)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getDishCookingSteps } from '../services/dishService';
import { supabase } from '../store/supabase';
import { C, shadow } from '../theme';
import MetaChip from '../components/ui/MetaChip';
import ScreenBackground from '../components/ui/ScreenBackground';
import SkyHeader from '../components/ui/SkyHeader';
import SegmentTabs, { TabPanel } from '../components/ui/SegmentTabs';

const CookingStepsScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const { dish = {}, dishId: paramDishId, dishUrl = '' } = route.params || {};
  const resolvedDishId = String(paramDishId ?? dish?.dish_id ?? dish?.id ?? '').trim();
  const currentLang = (i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi';

  const [stepsData, setStepsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // null | { code: 'UNAUTHORIZED'|'NOT_FOUND'|'NETWORK_ERROR', message: string }
  const [completedSteps, setCompletedSteps] = useState(() => new Set());
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'focus'
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const loadCookingSteps = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const data = await getDishCookingSteps(resolvedDishId, { lang: currentLang });
      setStepsData(data);
      setActiveStepIndex(0);
    } catch (err) {
      setErrorState({
        code: err?.code || 'NETWORK_ERROR',
        status: err?.status || null,
        message: err?.message || '',
      });
    } finally {
      setLoading(false);
    }
  }, [resolvedDishId, currentLang]);

  useEffect(() => {
    loadCookingSteps();
  }, [loadCookingSteps]);

  const toggleStepDone = useCallback((stepNo) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNo)) {
        next.delete(stepNo);
      } else {
        next.add(stepNo);
      }
      return next;
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    setCompletedSteps(new Set());
    setActiveStepIndex(0);
  }, []);

  const handleRelogin = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
  }, []);

  const displayTitle = stepsData?.title || dish?.title || '';
  const cookTime = stepsData?.cook_time_minutes ?? dish?.cook_time_min ?? null;
  const methodId = stepsData?.cooking_method_id || null;
  const methodLabel = methodId
    ? t(`dish.methods.${methodId}`, { defaultValue: methodId.replace(/_/g, ' ') })
    : null;

  const steps = stepsData?.steps || [];
  const totalSteps = stepsData ? steps.length : 0;
  const doneCount = completedSteps.size;

  const currentFocusStep = steps[activeStepIndex] || null;

  const hasSteps = !loading && !errorState && totalSteps > 0;
  const focusDone = currentFocusStep ? completedSteps.has(currentFocusStep.step_no) : false;
  const isLastStep = activeStepIndex >= totalSteps - 1;

  const goNext = () => {
    if (currentFocusStep && !focusDone) toggleStepDone(currentFocusStep.step_no);
    if (isLastStep) navigation.goBack();
    else setActiveStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  };

  return (
    <ScreenBackground texture="paper" edges={[]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: trời màu nước (biến thể "meal") ── */}
        <SkyHeader variant="meal" style={[s.header, { paddingTop: insets.top + 10 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="arrow-back" size={20} color={C.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerEyebrow} numberOfLines={1}>{t('dish.cookingStepsTitle')}</Text>
              <Text style={s.headerTitle} numberOfLines={2}>{displayTitle}</Text>
            </View>
          </View>

          <View style={s.summaryRow}>
            {hasSteps && <ProgressRing done={doneCount} total={totalSteps} />}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={s.chipsRow}>
                {cookTime > 0 && (
                  <MetaChip
                    icon={<Ionicons name="time-outline" size={13} color={C.textMid} />}
                    label={t('common.minutes', { count: cookTime })}
                  />
                )}
                {methodLabel && (
                  <MetaChip
                    icon={<Ionicons name="flame-outline" size={13} color={C.textMid} />}
                    label={methodLabel}
                  />
                )}
              </View>
              {hasSteps && (
                <View style={s.progressLine}>
                  <Text style={s.progressText}>
                    {doneCount >= totalSteps
                      ? t('dish.allStepsDone')
                      : t('dish.stepsLeft', { count: totalSteps - doneCount })}
                  </Text>
                  {doneCount > 0 && (
                    <TouchableOpacity onPress={handleResetProgress} activeOpacity={0.7} hitSlop={8}>
                      <Text style={s.resetText}>{t('dish.resetProgress')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </SkyHeader>

        <View style={s.body}>
          {/* Chế độ xem: Danh sách / Từng bước */}
          {hasSteps && (
            <SegmentTabs
              value={viewMode === 'list' ? 0 : 1}
              onChange={(i) => setViewMode(i === 0 ? 'list' : 'focus')}
              style={{ marginBottom: 14 }}
              items={[
                { key: 'list',  label: t('dish.listViewMode'),  icon: (c) => <Ionicons name="list" size={15} color={c} /> },
                { key: 'focus', label: t('dish.focusViewMode'), icon: (c) => <Ionicons name="albums-outline" size={15} color={c} /> },
              ]}
            />
          )}

          {/* Note khi ngôn ngữ là Tiếng Anh nhưng nội dung bước nấu là Tiếng Việt */}
          {hasSteps && currentLang === 'en' && (
            <View style={s.langNoteBox}>
              <Text style={s.langNoteText}>{t('dish.vietnameseStepsNote')}</Text>
            </View>
          )}

          {/* ── 1. LOADING ── */}
          {loading && (
            <View style={s.stateCard}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.stateTitle}>{t('dish.loadingSteps')}</Text>
            </View>
          )}

          {/* ── 2. ERROR (401, 404, Network) ── */}
          {!loading && errorState && (
            <View style={s.stateCard}>
              <View style={[s.stateIconCircle, { backgroundColor: 'rgba(231, 76, 60, 0.12)' }]}>
                <Ionicons
                  name={
                    errorState.code === 'UNAUTHORIZED'
                      ? 'lock-closed-outline'
                      : errorState.code === 'NOT_FOUND'
                        ? 'search-outline'
                        : 'cloud-offline-outline'
                  }
                  size={32}
                  color={C.accentRed}
                />
              </View>
              <Text style={s.stateTitle}>
                {errorState.code === 'UNAUTHORIZED'
                  ? t('dish.authExpiredTitle')
                  : errorState.code === 'NOT_FOUND'
                    ? t('dish.recipeNotFound')
                    : t('dish.loadStepsError')}
              </Text>
              <Text style={s.stateSub}>
                {errorState.code === 'UNAUTHORIZED'
                  ? t('dish.authExpiredSub')
                  : errorState.code === 'NOT_FOUND'
                    ? t('dish.recipeNotFoundSub')
                    : t('dish.loadStepsErrorSub')}
              </Text>
              {errorState.code === 'UNAUTHORIZED' ? (
                <TouchableOpacity style={s.primaryBtn} onPress={handleRelogin} activeOpacity={0.85}>
                  <Ionicons name="log-in-outline" size={18} color={C.parchmentLight} />
                  <Text style={s.primaryBtnText}>{t('dish.reloginBtn')}</Text>
                </TouchableOpacity>
              ) : errorState.code === 'NOT_FOUND' ? (
                <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={18} color={C.parchmentLight} />
                  <Text style={s.primaryBtnText}>{t('common.back')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.primaryBtn} onPress={loadCookingSteps} activeOpacity={0.85}>
                  <Ionicons name="refresh-outline" size={18} color={C.parchmentLight} />
                  <Text style={s.primaryBtnText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── 3. EMPTY (HTTP 200 nhưng không có bước) ── */}
          {!loading && !errorState && totalSteps === 0 && (
            <View style={s.stateCard}>
              <View style={s.stateIconCircle}>
                <Ionicons name="book-outline" size={32} color={C.primary} />
              </View>
              <Text style={s.stateTitle}>{t('dish.emptyCookingSteps')}</Text>
              <Text style={s.stateSub}>{t('dish.emptyCookingStepsSub')}</Text>
              {dishUrl ? (
                <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(dishUrl)} activeOpacity={0.85}>
                  <Ionicons name="open-outline" size={18} color={C.parchmentLight} />
                  <Text style={s.primaryBtnText}>{t('dish.sourceRecipeLink')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* ── 4. DANH SÁCH ── */}
          {hasSteps && viewMode === 'list' && (
            <TabPanel id="list" style={{ gap: 10 }}>
              <Text style={s.listHint}>{t('dish.cookingStepsSubtitle')}</Text>
              {steps.map((step) => (
                <StepRow
                  key={step.step_no}
                  step={step}
                  done={completedSteps.has(step.step_no)}
                  onPress={() => toggleStepDone(step.step_no)}
                  label={t('dish.stepNumber', { num: step.step_no })}
                  doneLabel={t('dish.stepDone')}
                />
              ))}
            </TabPanel>
          )}

          {/* ── 5. TỪNG BƯỚC ── */}
          {hasSteps && viewMode === 'focus' && currentFocusStep && (
            <View>
              {/* Thanh tiến độ chia đoạn — chạm để nhảy tới bước */}
              <View style={s.segRow}>
                {steps.map((st, idx) => {
                  const isCurrent = idx === activeStepIndex;
                  const isDone = completedSteps.has(st.step_no);
                  return (
                    <TouchableOpacity
                      key={st.step_no}
                      onPress={() => setActiveStepIndex(idx)}
                      style={s.segHit}
                      hitSlop={{ top: 10, bottom: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('dish.stepNumber', { num: st.step_no })}
                      accessibilityState={{ selected: isCurrent }}
                    >
                      <View
                        style={[
                          s.seg,
                          isDone && s.segDone,
                          isCurrent && s.segCurrent,
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TabPanel id={activeStepIndex}>
                <View style={[s.focusCard, focusDone && s.focusCardDone]}>
                  <View style={s.focusTop}>
                    <Text style={s.focusNum}>{String(currentFocusStep.step_no).padStart(2, '0')}</Text>
                    <Text style={s.focusOf}>
                      {t('dish.stepOf', { num: activeStepIndex + 1, total: totalSteps })}
                    </Text>
                    {focusDone && (
                      <View style={s.donePill}>
                        <Ionicons name="checkmark" size={12} color={C.freshText} />
                        <Text style={s.donePillText}>{t('dish.stepDone')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.focusInstruction}>{currentFocusStep.instruction}</Text>

                  <TouchableOpacity
                    style={s.toggleDone}
                    onPress={() => toggleStepDone(currentFocusStep.step_no)}
                    activeOpacity={0.75}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={focusDone ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={focusDone ? C.inkGreen : C.textSoft}
                    />
                    <Text style={[s.toggleDoneText, focusDone && { color: C.inkGreen }]}>
                      {focusDone ? t('dish.markStepUndone') : t('dish.markStepDone')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TabPanel>

              <View style={s.navRow}>
                <TouchableOpacity
                  style={[s.navBtn, s.navBtnGhost, activeStepIndex === 0 && { opacity: 0.45 }]}
                  disabled={activeStepIndex === 0}
                  onPress={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={C.text} />
                  <Text style={s.navGhostText}>{t('dish.prevStepShort')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.navBtn, s.navBtnPrimary, isLastStep && s.navBtnFinish]}
                  onPress={goNext}
                  activeOpacity={0.85}
                >
                  <Text style={s.navPrimaryText}>
                    {isLastStep ? t('dish.finishCookingShort') : t('dish.nextStepDone')}
                  </Text>
                  <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={16} color={C.parchmentLight} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Link công thức gốc ── */}
          {!loading && totalSteps > 0 && dishUrl ? (
            <TouchableOpacity style={s.sourceLinkBtn} onPress={() => Linking.openURL(dishUrl)} activeOpacity={0.8}>
              <Ionicons name="book-outline" size={16} color={C.primary} />
              <Text style={s.sourceLinkText}>{t('dish.sourceRecipeLink')}</Text>
              <Ionicons name="open-outline" size={14} color={C.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

// ── Vòng tiến độ ─────────────────────────────────────────────────────────────
const RING = 58;
const RING_STROKE = 6;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

const ProgressRing = ({ done, total }) => {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING}>
        <Circle
          cx={RING / 2} cy={RING / 2} r={RING_R}
          fill="rgba(255,250,240,0.92)" stroke="#EFE3C6" strokeWidth={RING_STROKE}
        />
        <Circle
          cx={RING / 2} cy={RING / 2} r={RING_R}
          fill="none" stroke={C.inkGreen} strokeWidth={RING_STROKE} strokeLinecap="round"
          strokeDasharray={`${RING_C * pct} ${RING_C}`}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.ringCenter]}>
        <Text style={s.ringText}>{done}/{total}</Text>
      </View>
    </View>
  );
};

// ── Một bước trong danh sách (có "nảy" khi tick xong) ────────────────────────
const StepRow = ({ step, done, onPress, label, doneLabel }) => {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [done, pop]);

  return (
    <TouchableOpacity
      style={[s.stepCard, done && s.stepCardDone]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      <Animated.View style={[s.stepBadge, done && s.stepBadgeDone, { transform: [{ scale: pop }] }]}>
        {done
          ? <Ionicons name="checkmark" size={16} color="#FFF" />
          : <Text style={s.stepBadgeNum}>{step.step_no}</Text>}
      </Animated.View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.stepHeaderLine}>
          <Text style={[s.stepLabel, done && { color: C.inkGreen }]}>{label}</Text>
          {done && <Text style={s.stepDoneTag}>{doneLabel}</Text>}
        </View>
        <Text style={[s.stepInstruction, done && s.stepInstructionDone]}>{step.instruction}</Text>
      </View>
    </TouchableOpacity>
  );
};

const CARD_BG = 'rgba(255,250,240,0.95)';
const CARD_BORDER = '#E4D3B0';

const s = StyleSheet.create({
  scroll: { flex: 1 },

  // Header
  header: { paddingHorizontal: 18, paddingBottom: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,250,240,0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  headerEyebrow: {
    fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11, color: C.textSoft,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  headerTitle: { fontFamily: 'Lora-Bold', fontSize: 21, lineHeight: 27, color: C.text, marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: C.textMid, flexShrink: 1 },
  resetText: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 12.5, color: C.accentRed, textDecorationLine: 'underline',
  },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: 'Lora-Bold', fontSize: 14, color: C.text },

  body: { paddingHorizontal: 18, marginTop: -6 },

  langNoteBox: {
    backgroundColor: C.seasonBg, borderRadius: 12, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(138,75,11,0.18)',
  },
  langNoteText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: C.seasonText, lineHeight: 18 },

  // States
  stateCard: {
    backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 1, borderColor: CARD_BORDER,
    padding: 24, alignItems: 'center', gap: 10, marginTop: 8,
  },
  stateIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139,94,60,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  stateTitle: { fontFamily: 'Lora-Bold', fontSize: 17, color: C.text, textAlign: 'center' },
  stateSub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 13.5, color: C.textSoft, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
    backgroundColor: C.woodDark, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
  },
  primaryBtnText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: C.parchmentLight },

  // List
  listHint: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: C.textSoft, marginBottom: 2 },
  stepCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: CARD_BORDER,
  },
  stepCardDone: { backgroundColor: 'rgba(227,244,234,0.85)', borderColor: 'rgba(47,143,98,0.35)' },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.paperStroke,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.parchmentLight,
  },
  stepBadgeDone: { backgroundColor: C.inkGreen, borderColor: C.inkGreen },
  stepBadgeNum: { fontFamily: 'Lora-Bold', fontSize: 14, color: C.woodDark },
  stepHeaderLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepLabel: { fontFamily: 'BeVietnamPro-Bold', fontSize: 12, color: C.textSoft, letterSpacing: 0.3 },
  stepDoneTag: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11.5, color: C.inkGreen },
  stepInstruction: { fontFamily: 'BeVietnamPro-Regular', fontSize: 15, lineHeight: 23, color: C.text },
  stepInstructionDone: { color: C.textSoft },

  // Focus
  segRow: { flexDirection: 'row', gap: 5, marginBottom: 14, marginTop: 2 },
  segHit: { flex: 1, paddingVertical: 4 },
  seg: { height: 6, borderRadius: 3, backgroundColor: CARD_BORDER },
  segDone: { backgroundColor: C.inkGreen },
  segCurrent: { backgroundColor: C.woodDark, height: 8, marginTop: -1 },
  focusCard: {
    backgroundColor: CARD_BG, borderRadius: 22, borderWidth: 1, borderColor: CARD_BORDER,
    padding: 20, minHeight: 220, ...shadow(2),
  },
  focusCardDone: { borderColor: 'rgba(47,143,98,0.45)' },
  focusTop: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  focusNum: { fontFamily: 'Lora-Bold', fontSize: 40, lineHeight: 44, color: C.paperStroke },
  focusOf: {
    flex: 1, fontFamily: 'BeVietnamPro-Bold', fontSize: 11.5, color: C.textSoft,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  donePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center',
    backgroundColor: C.freshBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  donePillText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11, color: C.freshText },
  focusInstruction: { fontFamily: 'BeVietnamPro-Regular', fontSize: 17, lineHeight: 27, color: C.text },
  toggleDone: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, alignSelf: 'flex-start' },
  toggleDoneText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: C.textSoft },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 50, borderRadius: 16, paddingHorizontal: 12,
  },
  navBtnGhost: { flex: 1, backgroundColor: CARD_BG, borderWidth: 1, borderColor: C.paperStroke },
  navBtnPrimary: { flex: 2, backgroundColor: C.woodDark },
  navBtnFinish: { backgroundColor: C.inkGreen },
  navGhostText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 14, color: C.text },
  navPrimaryText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 14.5, color: C.parchmentLight },

  // Source link
  sourceLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 20, paddingVertical: 12,
  },
  sourceLinkText: {
    fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13.5, color: C.primary, textDecorationLine: 'underline',
  },
});

export default CookingStepsScreen;
