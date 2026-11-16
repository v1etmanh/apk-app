/**
 * CookingStepsScreen.js — Màn hình hướng dẫn các bước nấu ăn chi tiết
 * Tích hợp endpoint: GET /api/v1/dishes/{dish_id}/cooking-steps
 * Phong cách thiết kế: Ghibli Handcrafted / Sổ tay nấu ăn (design.md & theme.js)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getDishCookingSteps } from '../services/dishService';
import { supabase } from '../store/supabase';
import { C, shadow } from '../theme';
import MetaChip from '../components/ui/MetaChip';

const ASSETS = {
  wood: require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

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
  const progressPct = totalSteps > 0 ? Math.min(100, Math.round((doneCount / totalSteps) * 100)) : 0;

  const currentFocusStep = steps[activeStepIndex] || null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Background Texture */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={ASSETS.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      {/* ── Top Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerEyebrow} numberOfLines={1}>
            {t('dish.cookingStepsTitle')}
          </Text>
          <Text style={s.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dish Summary Card ── */}
        <View style={s.summaryShadow}>
          <View style={s.summaryCard}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
              <Image source={ASSETS.paper} style={{ width: '100%', height: '100%', opacity: 0.9 }} resizeMode="cover" />
            </View>

            <View style={{ zIndex: 1 }}>
              <Text style={s.dishTitle}>{displayTitle}</Text>

              <View style={s.chipsRow}>
                {cookTime > 0 && (
                  <MetaChip
                    icon={<Ionicons name="time-outline" size={13} color={C.textMid} />}
                    label={t('common.minutes', { count: cookTime })}
                    style={s.chipItem}
                  />
                )}
                {methodLabel && (
                  <MetaChip
                    label={methodLabel}
                    style={s.chipItem}
                  />
                )}
                {!loading && !errorState && totalSteps > 0 && (
                  <MetaChip
                    variant="accent"
                    icon={<Ionicons name="list-outline" size={13} color={C.accentGreen} />}
                    label={t('dish.totalStepsBadge', { count: totalSteps })}
                    style={s.chipItem}
                  />
                )}
              </View>

              {/* Progress Bar & Mode Switcher (chỉ hiện khi có các bước nấu) */}
              {!loading && !errorState && totalSteps > 0 && (
                <View style={s.controlsSection}>
                  <View style={s.progressHeader}>
                    <Text style={s.progressLabel}>
                      {t('dish.cookingProgress', { done: doneCount, total: totalSteps })}
                    </Text>
                    {doneCount > 0 && (
                      <TouchableOpacity onPress={handleResetProgress} activeOpacity={0.7}>
                        <Text style={s.resetText}>{t('dish.resetProgress')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${progressPct}%` }]} />
                  </View>

                  {/* View Mode Switcher: List vs Step-by-Step */}
                  <View style={s.modeTabs}>
                    <TouchableOpacity
                      style={[s.modeTab, viewMode === 'list' && s.modeTabActive]}
                      onPress={() => setViewMode('list')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="list"
                        size={15}
                        color={viewMode === 'list' ? '#FFF' : C.textMid}
                      />
                      <Text style={[s.modeTabText, viewMode === 'list' && s.modeTabTextActive]}>
                        {t('dish.listViewMode')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.modeTab, viewMode === 'focus' && s.modeTabActive]}
                      onPress={() => setViewMode('focus')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="albums-outline"
                        size={15}
                        color={viewMode === 'focus' ? '#FFF' : C.textMid}
                      />
                      <Text style={[s.modeTabText, viewMode === 'focus' && s.modeTabTextActive]}>
                        {t('dish.focusViewMode')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Note khi ngôn ngữ là Tiếng Anh nhưng nội dung bước nấu là Tiếng Việt */}
        {!loading && !errorState && totalSteps > 0 && currentLang === 'en' && (
          <View style={s.langNoteBox}>
            <Text style={s.langNoteText}>{t('dish.vietnameseStepsNote')}</Text>
          </View>
        )}

        {/* ── 1. LOADING STATE ── */}
        {loading && (
          <View style={s.stateCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.stateTitle}>{t('dish.loadingSteps')}</Text>
          </View>
        )}

        {/* ── 2. ERROR STATES (401, 404, Network) ── */}
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
              <TouchableOpacity style={s.primaryActionBtn} onPress={handleRelogin} activeOpacity={0.85}>
                <Ionicons name="log-in-outline" size={18} color="#FFF" />
                <Text style={s.primaryActionText}>{t('dish.reloginBtn')}</Text>
              </TouchableOpacity>
            ) : errorState.code === 'NOT_FOUND' ? (
              <TouchableOpacity style={s.primaryActionBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={18} color="#FFF" />
                <Text style={s.primaryActionText}>{t('common.back')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.primaryActionBtn} onPress={loadCookingSteps} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={18} color="#FFF" />
                <Text style={s.primaryActionText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 3. EMPTY STATE (HTTP 200 nhưng total_steps === 0 / steps: []) ── */}
        {!loading && !errorState && totalSteps === 0 && (
          <View style={s.stateCard}>
            <View style={s.stateIconCircle}>
              <Ionicons name="book-outline" size={32} color={C.primary} />
            </View>
            <Text style={s.stateTitle}>{t('dish.emptyCookingSteps')}</Text>
            <Text style={s.stateSub}>{t('dish.emptyCookingStepsSub')}</Text>

            {dishUrl ? (
              <TouchableOpacity
                style={s.primaryActionBtn}
                onPress={() => Linking.openURL(dishUrl)}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={18} color="#FFF" />
                <Text style={s.primaryActionText}>{t('dish.sourceRecipeLink')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── 4. SUCCESS STATE — LIST VIEW ── */}
        {!loading && !errorState && totalSteps > 0 && viewMode === 'list' && (
          <View style={s.stepsListWrap}>
            <Text style={s.listHint}>{t('dish.cookingStepsSubtitle')}</Text>

            {steps.map((step) => {
              const isDone = completedSteps.has(step.step_no);
              return (
                <TouchableOpacity
                  key={step.step_no}
                  style={[s.stepCardShadow]}
                  onPress={() => toggleStepDone(step.step_no)}
                  activeOpacity={0.82}
                >
                  <View style={[s.stepCard, isDone && s.stepCardDone]}>
                    <View
                      style={[StyleSheet.absoluteFill, { borderRadius: 18, overflow: 'hidden' }]}
                      pointerEvents="none"
                    >
                      <Image
                        source={ASSETS.paper}
                        style={{ width: '100%', height: '100%', opacity: isDone ? 0.55 : 0.9 }}
                        resizeMode="cover"
                      />
                    </View>

                    <View style={s.stepRow}>
                      {/* Step Number / Check Badge */}
                      <View style={[s.stepBadge, isDone && s.stepBadgeDone]}>
                        {isDone ? (
                          <Ionicons name="checkmark" size={18} color="#FFF" />
                        ) : (
                          <Text style={s.stepBadgeNum}>{step.step_no}</Text>
                        )}
                      </View>

                      {/* Step Content */}
                      <View style={s.stepBody}>
                        <View style={s.stepHeaderLine}>
                          <Text style={[s.stepLabel, isDone && s.stepLabelDone]}>
                            {t('dish.stepNumber', { num: step.step_no })}
                          </Text>
                          {isDone && (
                            <View style={s.donePill}>
                              <Text style={s.donePillText}>{t('dish.stepDone')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[s.stepInstruction, isDone && s.stepInstructionDone]}>
                          {step.instruction}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── 5. SUCCESS STATE — FOCUS VIEW (STEP-BY-STEP) ── */}
        {!loading && !errorState && totalSteps > 0 && viewMode === 'focus' && currentFocusStep && (
          <View style={s.focusContainer}>
            {/* Step Dots Indicator */}
            <View style={s.stepDotsRow}>
              {steps.map((st, idx) => {
                const isCurrent = idx === activeStepIndex;
                const isDone = completedSteps.has(st.step_no);
                return (
                  <TouchableOpacity
                    key={st.step_no}
                    onPress={() => setActiveStepIndex(idx)}
                    style={[
                      s.stepDot,
                      isDone && s.stepDotDone,
                      isCurrent && s.stepDotCurrent,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.stepDotText,
                        (isDone || isCurrent) && { color: '#FFF' },
                      ]}
                    >
                      {st.step_no}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Large Focus Step Card */}
            <View style={s.focusCardShadow}>
              <View
                style={[
                  s.focusCard,
                  completedSteps.has(currentFocusStep.step_no) && s.stepCardDone,
                ]}
              >
                <View
                  style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}
                  pointerEvents="none"
                >
                  <Image
                    source={ASSETS.paper}
                    style={{ width: '100%', height: '100%', opacity: 0.92 }}
                    resizeMode="cover"
                  />
                </View>

                <View style={{ zIndex: 1 }}>
                  <View style={s.focusCardTop}>
                    <View
                      style={[
                        s.focusStepBadge,
                        completedSteps.has(currentFocusStep.step_no) && s.stepBadgeDone,
                      ]}
                    >
                      <Text style={s.focusStepBadgeText}>
                        {t('dish.stepNumber', { num: currentFocusStep.step_no })} / {totalSteps}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.focusInstruction}>{currentFocusStep.instruction}</Text>

                  <TouchableOpacity
                    style={[
                      s.markDoneBtn,
                      completedSteps.has(currentFocusStep.step_no) && s.markDoneBtnActive,
                    ]}
                    onPress={() => toggleStepDone(currentFocusStep.step_no)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        completedSteps.has(currentFocusStep.step_no)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={20}
                      color={completedSteps.has(currentFocusStep.step_no) ? '#FFF' : C.primary}
                    />
                    <Text
                      style={[
                        s.markDoneBtnText,
                        completedSteps.has(currentFocusStep.step_no) && { color: '#FFF' },
                      ]}
                    >
                      {completedSteps.has(currentFocusStep.step_no)
                        ? t('dish.markStepUndone')
                        : t('dish.markStepDone')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Prev / Next Navigation Buttons */}
            <View style={s.focusNavRow}>
              <TouchableOpacity
                style={[s.focusNavBtn, activeStepIndex === 0 && s.focusNavBtnDisabled]}
                disabled={activeStepIndex === 0}
                onPress={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                activeOpacity={0.8}
              >
                <Text style={s.focusNavPrevText}>{t('dish.prevStep')}</Text>
              </TouchableOpacity>

              {activeStepIndex < totalSteps - 1 ? (
                <TouchableOpacity
                  style={[s.focusNavBtn, s.focusNavBtnPrimary]}
                  onPress={() => {
                    // Tự động tick bước hiện tại khi bấm Bước tiếp
                    if (!completedSteps.has(currentFocusStep.step_no)) {
                      toggleStepDone(currentFocusStep.step_no);
                    }
                    setActiveStepIndex((i) => Math.min(totalSteps - 1, i + 1));
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.focusNavNextText}>{t('dish.nextStep')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.focusNavBtn, s.focusNavBtnFinish]}
                  onPress={() => {
                    if (!completedSteps.has(currentFocusStep.step_no)) {
                      toggleStepDone(currentFocusStep.step_no);
                    }
                    navigation.goBack();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.focusNavNextText}>{t('dish.finishCooking')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── External Recipe Link (nếu có) ── */}
        {!loading && totalSteps > 0 && dishUrl ? (
          <TouchableOpacity
            style={s.sourceLinkBtn}
            onPress={() => Linking.openURL(dishUrl)}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={16} color={C.primary} />
            <Text style={s.sourceLinkText}>{t('dish.sourceRecipeLink')}</Text>
            <Ionicons name="open-outline" size={14} color={C.primary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: 'rgba(245, 237, 220, 0.92)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.paperStroke,
    ...shadow(1),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerEyebrow: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 11,
    color: C.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontFamily: 'Lora-Bold',
    fontSize: 17,
    color: C.text,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
  },

  // Summary Card
  summaryShadow: {
    borderRadius: 20,
    ...shadow(4),
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: C.bg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: C.paperStroke,
  },
  dishTitle: {
    fontFamily: 'Lora-Bold',
    fontSize: 22,
    color: C.text,
    lineHeight: 30,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipItem: {
    marginRight: 8,
    marginBottom: 8,
  },

  // Progress & Mode Controls
  controlsSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 13,
    color: C.textMid,
  },
  resetText: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 12,
    color: C.primary,
    textDecorationLine: 'underline',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.accentGreen,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: C.primary,
    ...shadow(1),
  },
  modeTabText: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 13,
    color: C.textMid,
  },
  modeTabTextActive: {
    color: '#FFF',
  },

  // Language note
  langNoteBox: {
    backgroundColor: C.seasonBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3D19E',
  },
  langNoteText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 12.5,
    color: C.seasonText,
    lineHeight: 18,
  },

  // State Card (Loading / Empty / Error)
  stateCard: {
    marginTop: 12,
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5,
    borderColor: C.paperStroke,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 94, 60, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    fontFamily: 'Lora-Bold',
    fontSize: 18,
    color: C.text,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  stateSub: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 14,
    color: C.textMid,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    gap: 8,
    ...shadow(2),
  },
  primaryActionText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 14,
    color: '#FFF',
  },

  // List View
  stepsListWrap: {
    gap: 12,
  },
  listHint: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: C.textSoft,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  stepCardShadow: {
    borderRadius: 18,
    ...shadow(2),
  },
  stepCard: {
    borderRadius: 18,
    backgroundColor: C.parchmentLight,
    padding: 16,
    borderWidth: 1.2,
    borderColor: C.paperStroke,
  },
  stepCardDone: {
    borderColor: '#8FD1B2',
    backgroundColor: C.freshBg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepBadgeDone: {
    backgroundColor: C.accentGreen,
  },
  stepBadgeNum: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: '#FFF',
  },
  stepBody: {
    flex: 1,
  },
  stepHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepLabel: {
    fontFamily: 'Lora-Bold',
    fontSize: 15,
    color: C.primary,
  },
  stepLabelDone: {
    color: C.freshText,
  },
  donePill: {
    backgroundColor: 'rgba(56, 176, 122, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  donePillText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 11,
    color: C.freshText,
  },
  stepInstruction: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: C.text,
    lineHeight: 23,
  },
  stepInstructionDone: {
    color: C.textSoft,
  },

  // Focus View (Step-by-step)
  focusContainer: {
    marginTop: 4,
  },
  stepDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: C.paperStroke,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: C.accentGreen,
    borderColor: C.accentGreen,
  },
  stepDotCurrent: {
    backgroundColor: C.primary,
    borderColor: C.woodDark,
    transform: [{ scale: 1.1 }],
  },
  stepDotText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 13,
    color: C.textMid,
  },
  focusCardShadow: {
    borderRadius: 22,
    ...shadow(4),
    marginBottom: 18,
  },
  focusCard: {
    borderRadius: 22,
    backgroundColor: C.parchmentLight,
    padding: 22,
    borderWidth: 1.5,
    borderColor: C.paperStroke,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  focusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  focusStepBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  focusStepBadgeText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 13,
    color: '#FFF',
  },
  focusInstruction: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 17.5,
    color: C.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  markDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'rgba(255,255,255,0.65)',
    gap: 8,
  },
  markDoneBtnActive: {
    backgroundColor: C.accentGreen,
    borderColor: C.accentGreen,
  },
  markDoneBtnText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 14,
    color: C.primary,
  },
  focusNavRow: {
    flexDirection: 'row',
    gap: 12,
  },
  focusNavBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: C.paperStroke,
  },
  focusNavBtnDisabled: {
    opacity: 0.45,
  },
  focusNavBtnPrimary: {
    backgroundColor: C.primary,
    borderColor: C.woodDark,
    ...shadow(2),
  },
  focusNavBtnFinish: {
    backgroundColor: C.accentGreen,
    borderColor: '#24563F',
    ...shadow(2),
  },
  focusNavPrevText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: C.text,
  },
  focusNavNextText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: '#FFF',
  },

  // Source Link Button
  sourceLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
  },
  sourceLinkText: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 13.5,
    color: C.primary,
    textDecorationLine: 'underline',
  },
});

export default CookingStepsScreen;
