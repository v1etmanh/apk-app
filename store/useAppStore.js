// store/useAppStore.js
import { create } from 'zustand';
import { loadProfile, loadLatestMetrics, loadAllergies, getSetting, loadAllIngredients } from '../utils/database';

export const useAppStore = create((set, get) => ({
  profile:          null,
  latestMetrics:    null,
  allergies:        [],
  currentSession:   null,
  currentSessionId: null,
  rankedDishes:     [],
  isLoading:        false,
  error:            null,
  location:         { lat: null, lon: null, province: '', food_region: '' },
  maxPrepTime:      60,   // F02: thời gian nấu tối đa (phút). 999 = không giới hạn
  costPreference:   2,    // F03: 1=Tiết kiệm | 2=Vừa phải | 3=Thoải mái
  allIngredients:   [],   // Cache toàn bộ ingredients (1100+) — load 1 lần khi app khởi động

  // F08 — Taste Profile
  tasteProfile:        null,   // { sweet, sour, salty, bitter, umami, spicy, astringent }
  hometownProvinceId:  null,   // int | null
  tasteMode:           'hometown', // 'manual' | 'hometown'
  provinces:           [],     // cache 63 tỉnh từ Firestore

  // MarketBasket — giỏ nguyên liệu của phiên hiện tại
  marketBasket: {
    selectedIngredients: [],  // Array<number> ingredient_id
    isSkipped:           true,
    boostStrategy:       'strict',
  },

  setProfile:          (profile)   => set({ profile }),
  setLatestMetrics:    (metrics)   => set({ latestMetrics: metrics }),
  setAllergies:        (allergies) => set({ allergies: [...allergies] }),
  setCurrentSession:   (session)   => set({ currentSession: session }),
  setCurrentSessionId: (id)        => set({ currentSessionId: id }),
  setRankedDishes:     (dishes)    => set({ rankedDishes: [...dishes] }),
  setLoading:          (loading)   => set({ isLoading: loading }),
  setError:            (error)     => set({ error }),
  setLocation:         (location)  => set({
    location: {
      lat: location?.lat ?? null,
      lon: location?.lon ?? null,
      province: location?.province ?? '',
      food_region: location?.food_region ?? '',
    },
  }),
  setMaxPrepTime:      (val)       => set({ maxPrepTime: Number(val) }),
  setCostPreference:   (val)       => set({ costPreference: Number(val) }),  // F03
  setAllIngredients:   (list)      => set({ allIngredients: list }),

  // F08 — Taste Profile setters
  setTasteProfile:     (profile)   => set({ tasteProfile: profile }),
  setHometown:         (id)        => set({ hometownProvinceId: id }),
  setTasteMode:        (mode)      => set({ tasteMode: mode }),
  setProvinces:        (list)      => set({ provinces: list }),

  setMarketBasket: (basket) => set({
    marketBasket: {
      selectedIngredients: basket.selectedIngredients ?? [],
      isSkipped:           basket.isSkipped ?? false,
      boostStrategy:       basket.boostStrategy ?? 'strict',
    },
  }),

  clearMarketBasket: () => set({
    marketBasket: { selectedIngredients: [], isSkipped: true, boostStrategy: 'strict' },
  }),

  loadProfile: async () => {
    try {
      const profile = await loadProfile();
      if (profile) set({ profile });
      return profile;
    } catch (e) { console.error('loadProfile:', e); return null; }
  },

  loadLatestMetrics: async () => {
    try {
      const metrics = await loadLatestMetrics();
      if (metrics) set({ latestMetrics: metrics });
      return metrics;
    } catch (e) { console.error('loadLatestMetrics:', e); return null; }
  },

  loadAllergies: async () => {
    try {
      const rows = await loadAllergies();
      const allergies = rows.map(r => r.allergy_key);
      set({ allergies });
      return allergies;
    } catch (e) { console.error('loadAllergies:', e); return []; }
  },

  // FIX (Hiệu suất): gộp 3 initializeX thành 1 hàm, dùng Promise.all để lấy
  // tất cả settings song song — tiết kiệm ít nhất 2 AsyncStorage round-trip khi app start.
  // FIX (Logic): xóa console.log nhạy cảm, wrap __DEV__ nếu cần debug.
  initializeSettings: async () => {
    try {
      const [lat, lon, province, cookTime, costPref] = await Promise.all([
        getSetting('last_known_lat'),
        getSetting('last_known_lon'),
        getSetting('last_known_province'),
        getSetting('max_cook_time'),
        getSetting('cost_preference'),
      ]);

      const location = {
        lat:         lat      ? parseFloat(lat) : null,
        lon:         lon      ? parseFloat(lon) : null,
        province:    province ?? '',
        food_region: '',
      };

      const parsedCookTime = cookTime ? parseInt(cookTime, 10) : 60;
      const parsedCostPref = costPref ? parseInt(costPref, 10) : 2;

      set({
        location,
        maxPrepTime:    isNaN(parsedCookTime) ? 60 : parsedCookTime,
        costPreference: isNaN(parsedCostPref) ? 2  : parsedCostPref,
      });

      if (__DEV__) {
        console.log('[Store] initializeSettings:', { location, parsedCookTime, parsedCostPref });
      }

      return { location, maxPrepTime: parsedCookTime, costPreference: parsedCostPref };
    } catch (e) {
      console.error('initializeSettings:', e);
      return null;
    }
  },

  // Giữ lại các hàm cũ để tương thích ngược — delegate sang initializeSettings
  initializeLocation:      async () => get().initializeSettings(),
  initializeMaxPrepTime:   async () => get().initializeSettings(),
  initializeCostPreference: async () => get().initializeSettings(),

  // Load tất cả ingredients vào memory — gọi 1 lần khi app start
  initializeIngredients: async () => {
    try {
      const list = await loadAllIngredients();
      set({ allIngredients: list });
      if (__DEV__) console.log('[Store] allIngredients loaded:', list.length);
    } catch (e) { console.error('initializeIngredients:', e); }
  },
}));
