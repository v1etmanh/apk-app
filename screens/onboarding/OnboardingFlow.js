// screens/onboarding/OnboardingFlow.js
// Stack 5 màn onboarding + context giữ bản nháp (tự lưu AsyncStorage để resume).
//
//   mode = 'full'       : Body → Region → Diet → Taste → Confirm   (App.js, tab Khẩu vị)
//   mode = 'newProfile' : như full, nhưng tạo hồ sơ thành viên mới (profileMeta), không lưu nháp
//   mode = 'taste'      : Region → Taste → Confirm                  (banner cho user cũ, từ Home)
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { View, ActivityIndicator } from 'react-native';
import { C } from '../../theme';
import {
  DEFAULT_DRAFT, loadDraft, saveDraft, completeOnboarding, saveTasteOnly, fetchFlashcards,
  ALLERGY_OPTIONS,
} from '../../services/onboardingService';
import { getActiveProfileId, loadAllergiesForProfile } from '../../utils/database';
import OnbBody from './OnbBody';
import OnbRegion from './OnbRegion';
import OnbDiet from './OnbDiet';
import OnbTaste from './OnbTaste';
import OnbConfirm from './OnbConfirm';
import { getProfileAge } from '../../utils/profileIdentity';

const Stack = createStackNavigator();

export const ROUTES = {
  full:       ['OnbBody', 'OnbRegion', 'OnbDiet', 'OnbTaste', 'OnbConfirm'],
  newProfile: ['OnbBody', 'OnbRegion', 'OnbDiet', 'OnbTaste', 'OnbConfirm'],
  taste:      ['OnbRegion', 'OnbTaste', 'OnbConfirm'],
};

const OnboardingContext = createContext(null);
export const useOnboarding = () => useContext(OnboardingContext);

const OnboardingFlow = ({ mode = 'full', onFinish, onCancel, profileMeta }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null);
  const cardsPromise = useRef(null);
  const resumeStep = useRef(0);
  const newProfileId = useRef(null);
  const routes = ROUTES[mode] || ROUTES.full;

  // Khởi tạo nháp:
  //   full       → resume nháp AsyncStorage, hoặc điền sẵn dữ liệu hồ sơ đang hoạt động
  //   taste      → điền sẵn từ hồ sơ đang hoạt động
  //   newProfile → nháp trống (thành viên mới)
  useEffect(() => {
    (async () => {
      if (mode === 'newProfile') {
        setDraft({ ...DEFAULT_DRAFT, birth_year: profileMeta?.birth_year ?? null,
          gender: ['male', 'female'].includes(profileMeta?.gender) ? profileMeta.gender : null });
        return;
      }
      const { profile, latestMetrics } = useAppStore.getState();
      // Dị ứng đã lưu: nhóm chuẩn → allergies, id số → nguyên liệu cụ thể (giữ tên hiển thị)
      const groupKeys = new Set(ALLERGY_OPTIONS.map(o => o.key));
      let rows = [];
      try {
        const pid = await getActiveProfileId();
        rows = pid ? await loadAllergiesForProfile(pid) : [];
      } catch {}
      const savedGroups = rows.map(r => String(r.allergy_key)).filter(k => groupKeys.has(k));
      const savedItems = rows
        .filter(r => /^\d+$/.test(String(r.allergy_key)))
        .map(r => ({ id: Number(r.allergy_key), name: r.display_name || String(r.allergy_key), group: null }));

      // User cũ: điền sẵn dữ liệu đã có (giới tính mặc định 'male' của hồ sơ mới thì không tính)
      const hasRealData = !!latestMetrics?.height_cm || mode === 'taste';
      const height = Number(latestMetrics?.height_cm);
      const weight = Number(latestMetrics?.weight_kg);
      const base = {
        ...DEFAULT_DRAFT,
        birth_year: profile?.birth_year ?? null,
        gender:        hasRealData ? (profile?.gender === 'female' ? 'female' : profile?.gender === 'male' ? 'male' : null) : null,
        height:        height >= 30 && height <= 220 ? Math.round(height) : DEFAULT_DRAFT.height,
        weight:        weight >= 1 && weight <= 150 ? Math.round(weight * 2) / 2 : DEFAULT_DRAFT.weight,
        nation:        profile?.nation === 'other' ? 'other' : 'vietnam',
        home_region:   profile?.home_region ?? null,
        diet_type:     profile?.diet_type ?? 'omnivore',
        allergies:     savedGroups,
        allergy_items: savedItems,
      };
      if (mode === 'full') {
        const saved = await loadDraft();
        if (saved) {
          resumeStep.current = getProfileAge({ ...base, ...saved }) === null ? 0 : Math.min(saved.step || 0, routes.length - 1);
          setDraft({ ...base, ...saved });
          return;
        }
      }
      const none = base.allergies.length === 0 && base.allergy_items.length === 0;
      setDraft({ ...base, noAllergy: hasRealData && none });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch) => {
    setDraft(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      if (mode === 'full') saveDraft(next);
      return next;
    });
  }, [mode]);

  const prefetchCards = useCallback((d) => {
    cardsPromise.current = fetchFlashcards(d).catch(e => { cardsPromise.current = null; throw e; });
    cardsPromise.current.catch(() => {});
  }, []);

  const allergyLabel = useCallback((k) => t(`onboarding.allergies.${k}`, { defaultValue: k }), [t]);

  const finish = useCallback(async (finalDraft) => {
    let profileId;
    if (mode === 'newProfile') {
      newProfileId.current ??= 'profile_' + Date.now().toString(36);
      profileId = await completeOnboarding(finalDraft, allergyLabel, { profileId: newProfileId.current, meta: profileMeta || {} });
      await useAppStore.getState().loadAllProfilesAction();
    } else if (mode === 'full') {
      profileId = await completeOnboarding(finalDraft, allergyLabel);
    } else {
      profileId = await saveTasteOnly(finalDraft);
    }
    await useAppStore.getState().switchProfile(profileId);
    await onFinish?.(profileId);
  }, [mode, allergyLabel, onFinish, profileMeta]);

  const value = useMemo(() => ({
    draft, update, mode, routes, total: routes.length,
    stepOf: (name) => routes.indexOf(name) + 1,
    nextRoute: (name) => routes[routes.indexOf(name) + 1],
    cardsPromise, prefetchCards, finish, onCancel, resumeStep,
  }), [draft, update, mode, routes, prefetchCards, finish, onCancel]);

  if (!draft) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const screens = { OnbBody, OnbRegion, OnbDiet, OnbTaste, OnbConfirm };
  return (
    <OnboardingContext.Provider value={value}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={routes[0]}>
        {routes.map(name => <Stack.Screen key={name} name={name} component={screens[name]} />)}
      </Stack.Navigator>
    </OnboardingContext.Provider>
  );
};

/**
 * Hook cho màn đầu tiên: nếu có nháp đang dở, reset stack tới đúng màn đã dừng.
 */
export const useResumeOnboarding = (navigation) => {
  const ctx = useOnboarding();
  useEffect(() => {
    const step = ctx?.resumeStep.current || 0;
    if (step > 0) {
      ctx.resumeStep.current = 0;
      const target = ctx.routes.slice(0, step + 1);
      navigation.reset({ index: target.length - 1, routes: target.map(name => ({ name })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

/** Chuyển sang màn kế tiếp + ghi lại step để resume. */
export const goNext = (ctx, navigation, current) => {
  const next = ctx.nextRoute(current);
  if (!next) return;
  ctx.update({ step: ctx.routes.indexOf(next) });
  navigation.navigate(next);
};

export default OnboardingFlow;
