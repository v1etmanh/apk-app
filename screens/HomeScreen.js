import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar, ImageBackground,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';
import {
  saveSession, saveDishesToSession,
  loadSessions, loadDishesBySession,
  getWeatherCache, setWeatherCache, setSetting,
  getRecentDishIds, saveRecentDishesCache, loadRecentDishesCache, getSetting,
} from '../utils/database';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import WoodButton from '../components/ui/WoodButton';
import WeatherAnimationSprite from '../components/ui/WeatherAnimationSprite';
import SeasonBubble from '../components/ui/SeasonBubble';
import ProfileSwitcherSheet from '../components/ProfileSwitcherSheet';
import MealFilterPanel, { DEFAULT_MEAL_FILTERS, sanitizeMealFilters } from '../components/MealFilterPanel';
import { buildBaseSearchParams } from '../utils/searchParams';
import { shouldShowTasteBanner, dismissTasteBanner } from '../services/onboardingService';
import { Drop } from 'phosphor-react-native/lib/module/icons/Drop';
import { Wind } from 'phosphor-react-native/lib/module/icons/Wind';
import { Gauge } from 'phosphor-react-native/lib/module/icons/Gauge';

// ── Assets ────────────────────────────────────────────────────────────────────
const ASSETS = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};
const ANIM_CAT = require('../assets/animations/Lazy cat.json');
const COOKING = require('../assets/animations/pizza ingrediants.json');
const DEFAULT_LOCATION = { lat: 16.047, lon: 108.206, province: 'Đà Nẵng' };
const isValidCoordinate = (value, min, max) => {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};
const hasValidLocation = (loc) => (
  isValidCoordinate(loc?.lat, -90, 90) && isValidCoordinate(loc?.lon, -180, 180)
);
const normalizeLocation = (loc) => (
  hasValidLocation(loc)
    ? { ...loc, lat: Number(loc.lat), lon: Number(loc.lon) }
    : DEFAULT_LOCATION
);

// Removed local T object, using C from theme

// ── AQI label ─────────────────────────────────────────────────────────────────
const aqiInfo = (aqi, t = (key) => key) => {
  if (aqi <= 50)  return { label: t('home.good'),        color: C.accentGreen, textColor: '#275231', bgColor: 'rgba(74, 124, 89, 0.12)' };
  if (aqi <= 100) return { label: t('home.average'), color: C.amber,       textColor: '#8A5D00', bgColor: 'rgba(200, 134, 10, 0.12)' };
  if (aqi <= 150) return { label: t('home.unhealthy'),  color: '#C8601A',     textColor: '#9E450E', bgColor: 'rgba(200, 96, 26, 0.12)' };
  return               { label: t('home.dangerous'),    color: '#B84040',     textColor: '#8C2B2B', bgColor: 'rgba(184, 64, 64, 0.12)' };
};

const uvInfo = (uv, t = (key) => key) => {
  if (uv <= 2)  return { label: t('home.low'),       color: C.accentGreen, textColor: '#275231', bgColor: 'rgba(74, 124, 89, 0.12)' };
  if (uv <= 5)  return { label: t('home.average'),   color: C.amber,       textColor: '#8A5D00', bgColor: 'rgba(200, 134, 10, 0.12)' };
  if (uv <= 7)  return { label: t('home.high'),        color: '#C8601A',     textColor: '#9E450E', bgColor: 'rgba(200, 96, 26, 0.12)' };
  if (uv <= 10) return { label: t('home.veryHigh'),    color: '#C06010',     textColor: '#94460A', bgColor: 'rgba(192, 96, 16, 0.12)' };
  return               { label: t('home.extreme'), color: '#B84040',     textColor: '#8C2B2B', bgColor: 'rgba(184, 64, 64, 0.12)' };
};

const getSeasonInfo = (seasonStr = '') => {
  const s = seasonStr.toLowerCase();
  if (s.includes('xuân')) return { icon: 'flower-outline', color: '#275231', bgColor: 'rgba(74, 124, 89, 0.12)' };
  if (s.includes('hè'))   return { icon: 'sunny-outline', color: '#9E450E', bgColor: 'rgba(200, 96, 26, 0.12)' };
  if (s.includes('thu'))  return { icon: 'leaf-outline', color: '#8A5D00', bgColor: 'rgba(200, 134, 10, 0.12)' };
  if (s.includes('đông')) return { icon: 'snow-outline', color: '#2B5A8C', bgColor: 'rgba(64, 124, 184, 0.12)' };
  return { icon: 'calendar-outline', color: C.primary, bgColor: 'rgba(0,0,0,0.05)' };
};

const weatherIcon = (cond = '', temp = 30) => {
  const c = cond.toLowerCase();
  if (c.includes('rain') || c.includes('mưa'))  return '🌧️';
  if (c.includes('storm') || c.includes('bão')) return '⛈️';
  if (c.includes('cloud') || c.includes('mây')) return '⛅';
  if (c.includes('fog')  || c.includes('sương'))return '🌫️';
  if (temp > 33) return '☀️';
  if (temp > 28) return '🌤️';
  return '🌥️';
};

// ── UV dots bar ───────────────────────────────────────────────────────────────
const UVBar = ({ value }) => {
  const filled = Math.round(Math.min(value, 11) / 11 * 10);
  const { color } = uvInfo(value);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={{
          width: 18, height: 6, borderRadius: 3,
          backgroundColor: i < filled ? color : 'rgba(92,58,30,0.12)',
          borderWidth: i < filled ? 0 : 0.5,
          borderColor: C.border,
        }} />
      ))}
    </View>
  );
};

// ── AQI progress bar ──────────────────────────────────────────────────────────
const AQIBar = ({ value }) => {
  const pct = Math.min(value / 300, 1);
  const { color } = aqiInfo(value);
  return (
    <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(92,58,30,0.12)', borderRadius: 3, borderWidth: 0.5, borderColor: C.border }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
};

const MetricScaleBar = ({ value, max, color, labels }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(safeValue / max, 1));

  return (
    <View style={s.metricContainer}>
      <View style={s.metricScaleTrack}>
        <View style={[s.metricScaleFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        <View style={[s.metricScaleThumb, { left: `${pct * 100}%`, shadowColor: color }]}>
          <View style={[s.metricScaleThumbInner, { backgroundColor: color }]} />
        </View>
      </View>
      <View style={s.metricScaleTicks}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={s.metricScaleTick} />
        ))}
      </View>
      <View style={s.metricScaleLabels}>
        {labels.map((label) => (
          <Text key={label} style={s.metricScaleLabel}>{label}</Text>
        ))}
      </View>
    </View>
  );
};

// ── Wood metric cell ──────────────────────────────────────────────────────────
const METRIC_ICONS = { Drop, Wind, Gauge };

const WoodMetricCell = ({ iconName, value, unit, label, accentColor = 'rgba(255,220,150,0.18)' }) => {
  const IconComp = METRIC_ICONS[iconName];
  return (
    <ImageBackground source={ASSETS.wood} style={s.woodCell} imageStyle={s.woodCellImg} resizeMode="cover">
      <View style={s.woodCellOverlay}>
        {/* Icon badge row */}
        <View style={[s.woodIconBadge, { backgroundColor: accentColor }]}>
          {IconComp && <IconComp size={18} color="rgba(255,248,225,0.85)" weight="fill" />}
          <Text style={s.woodLabel} numberOfLines={1}>{label.toUpperCase()}</Text>
        </View>
        {/* Divider */}
        <View style={s.woodDivider} />
        {/* Value col: number full-width, unit below */}
        <View style={s.woodValCol}>
          <Text style={s.woodVal} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.4}>
            {value ?? '--'}
          </Text>
          {unit ? <Text style={s.woodUnit}>{unit}</Text> : null}
        </View>
      </View>
    </ImageBackground>
  );
};

const FilterFlagMark = ({ code }) => {
  if (code === 'GLOBAL') {
    return (
      <View style={[s.filterFlagBase, s.filterFlagGlobal]}>
        <Ionicons name="earth" size={11} color="#FFFFFF" />
      </View>
    );
  }

  if (code === 'VN') {
    return (
      <View style={[s.filterFlagBase, s.filterFlagVN]}>
        <Text style={s.filterFlagStar}>★</Text>
      </View>
    );
  }

  return null;
};

const LOC_BANNER_KEY = 'location_banner_dismissed_date';

// ─────────────────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const isLoadingRef       = React.useRef(false);
  const prevBasketCountRef = React.useRef(-1);

  const [refreshing, setRefreshing]         = useState(false);
  const cuisineScope                        = 'global';
  const [dishFilter, setDishFilter]         = useState('all');
  const [isDirty, setIsDirty]               = useState(false);
  const [basketBadge, setBasketBadge]       = useState(0);
  const [showSwitcher, setShowSwitcher]     = useState(false);
  const [showLocBanner, setShowLocBanner]   = useState(false); // banner nhắc location
  const [mealFilters, setMealFilters]       = useState(DEFAULT_MEAL_FILTERS); // dụng cụ bếp
  const [searchMode, setSearchMode]         = useState('suggest');            // 'suggest' | 'fridge'
  const [tasteBannerHidden, setTasteBannerHidden] = useState(false);
  const [showWeatherDetails, setShowWeatherDetails] = useState(false); // độ ẩm/gió/AQI/UV thu gọn mặc định
  const toggleWeatherDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowWeatherDetails(v => !v);
  };
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsDirty(true);
  }, [dishFilter]);

  // Bộ lọc theo bữa: nhớ lựa chọn gần nhất
  useEffect(() => {
    getSetting('last_meal_filters')
      .then(raw => { if (raw) setMealFilters(sanitizeMealFilters(JSON.parse(raw))); })
      .catch(() => {});
    getSetting('search_mode')
      .then(v => { if (v === 'suggest' || v === 'fridge') setSearchMode(v); })
      .catch(() => {});
  }, []);

  const chooseMode = (mode) => {
    setSearchMode(mode);
    setSetting('search_mode', mode).catch(() => {});
  };

  const updateMealFilters = (next) => {
    setMealFilters(next);
    setIsDirty(true);
    setSetting('last_meal_filters', JSON.stringify(next)).catch(() => {});
  };

  // Kiểm tra quyền vị trí mỗi ngày 1 lần — hiện banner nếu chưa cấp
  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const dismissed = await AsyncStorage.getItem(LOC_BANNER_KEY);
        if (dismissed === today) return; // Đã dismiss hôm nay rồi
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') setShowLocBanner(true);
      } catch {}
    })();
  }, []);

  const {
    profile, latestMetrics, setRankedDishes,
    location, setLocation, allergies, setCurrentSessionId,
    marketBasket, maxPrepTime, costPreference,
    profiles, activeProfileId,
    weatherData, setWeatherData,
    tasteProfile,
  } = useAppStore();

  useEffect(() => {
    const count = marketBasket?.selectedIngredients?.length ?? 0;
    setBasketBadge(count);
    prevBasketCountRef.current = count;
  }, [marketBasket?.selectedIngredients?.length]);

  useFocusEffect(useCallback(() => {
    const safeLocation = normalizeLocation(location);
    const lat = safeLocation.lat;
    const lon = safeLocation.lon;
    loadRecentDishesCache().then(cached => {
      if (cached.length > 0) setRankedDishes(cached);
    });
    // Đã có data trong store (từ phiên này) → dùng luôn, không fetch lại
    const storeWeather = useAppStore.getState().weatherData;
    if (!storeWeather) {
      fetchWeather(lat, lon);
    }
  }, [location]));

  const getUserLocation = async () => {
    try {
      // App.js đã fetch GPS lúc start/resume và lưu vào store + last_known
      // → ưu tiên đọc từ store (luôn mới nhất trong phiên này)
      const storeLocation = useAppStore.getState().location;
      if (storeLocation?.lat && storeLocation?.lon) {
        return { lat: storeLocation.lat, lon: storeLocation.lon };
      }
      // Fallback: đọc cache AsyncStorage nếu store chưa có (edge case lần đầu)
      const latStr = await getSetting('last_known_lat');
      const lonStr = await getSetting('last_known_lon');
      if (latStr && lonStr) return { lat: Number(latStr), lon: Number(lonStr) };
      return null; // → normalizeLocation() fallback DEFAULT_LOCATION
    } catch { return null; }
  };

  const gridKey = (lat, lon) => `${Math.round(Number(lat) * 10) / 10}:${Math.round(Number(lon) * 10) / 10}`;

  const fetchWeather = async (lat, lon, forceRefresh = false) => {
    const loc = normalizeLocation({ lat, lon });
    const key = gridKey(loc.lat, loc.lon);
    if (!forceRefresh) {
      const cached = await getWeatherCache(key);
      if (cached?.temperature != null) { setWeatherData(cached); return cached; }
    }
    try {
      const res = await api.get(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
      const hr = new Date().getHours();
      await setWeatherCache(key, res.data, hr >= 6 && hr < 22 ? 15 : 30);
      setWeatherData(res.data);   // → lưu vào store, cả phiên dùng giá trị này
      return res.data;
    } catch {
      // Fallback offline — chỉ set nếu store chưa có gì (không ghi đè data thật)
      if (!useAppStore.getState().weatherData) {
        const fb = { temperature: 30, condition: 'Không rõ (offline)', humidity: 70, wind_speed: 10, aqi: 85, uv_index: 5, pressure: 1010, season: 'summer' };
        setWeatherData(fb);
        return fb;
      }
      return useAppStore.getState().weatherData;
    }
  };

  const goSearch = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    const gps = await getUserLocation();
    const currentLocation = gps || normalizeLocation(location);
    const safeCurrentLocation = normalizeLocation(currentLocation);
    setLocation(safeCurrentLocation);
    if (gps) {
      await setSetting('last_known_lat', String(gps.lat));
      await setSetting('last_known_lon', String(gps.lon));
    }
    const weather = await fetchWeather(safeCurrentLocation.lat, safeCurrentLocation.lon);
    const baseParams = buildBaseSearchParams({
      profile, latestMetrics, tasteProfile, allergies, maxPrepTime, costPreference,
      location: safeCurrentLocation, weather,
      dishFilter, tools: mealFilters.cooking_tools, cuisineScope,
    });
    // Gợi ý cho tôi → bước chọn nguyên liệu; Từ tủ lạnh → chọn đồ đang có → ra món luôn
    if (searchMode === 'fridge') {
      navigation.navigate('MarketBasket', { baseParams, next: 'recommend' });
    } else {
      navigation.navigate('IngredientSuggest', { baseParams });
    }
    setIsDirty(false);
    isLoadingRef.current = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const gps = await getUserLocation();
    const loc = gps || normalizeLocation(location);
    const safeLocation = normalizeLocation(loc);
    if (gps) setLocation(gps);
    await fetchWeather(safeLocation.lat, safeLocation.lon, true); // force bỏ qua cache
    setRefreshing(false);
  };

  // Xử lý khi user bấm "Cho phép" trên banner location
  const handleAllowLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      // Lấy vị trí thật và refresh weather ngay
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = Math.round(loc.coords.latitude  * 100) / 100;
        const lon = Math.round(loc.coords.longitude * 100) / 100;
        await setSetting('last_known_lat', String(lat));
        await setSetting('last_known_lon', String(lon));
        setLocation({ lat, lon, province: location?.province || '' });
        fetchWeather(lat, lon);
      } catch {}
    }
    setShowLocBanner(false);
    // Lưu ngày dismiss dù granted hay denied — không hỏi lại hôm nay nữa
    await AsyncStorage.setItem(LOC_BANNER_KEY, new Date().toISOString().slice(0, 10));
  };

  // Dismiss banner mà không xin quyền — không hỏi lại hôm nay
  const handleDismissLocBanner = async () => {
    setShowLocBanner(false);
    await AsyncStorage.setItem(LOC_BANNER_KEY, new Date().toISOString().slice(0, 10));
  };

  const icon = weatherIcon(weatherData?.condition, weatherData?.temperature);
  const aqi  = aqiInfo(weatherData?.aqi ?? 0, t);
  const uv   = uvInfo(weatherData?.uv_index ?? 0, t);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenBackground texture="sky">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textMid} />
        }
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={16} color={C.textMid} />
              <Text style={s.locationLabel}>
                {location?.province
                  ? ` ${location.province}`
                  : location?.lat && location?.lon
                    ? ` ${Number(location.lat).toFixed(4)}, ${Number(location.lon).toFixed(4)}`
                    : ` ${t('home.determining')}`}
              </Text>
            </View>
            <Text style={s.dateLabel}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </Text>
          </View>

          {/* Profile switcher button */}
          <TouchableOpacity
            style={s.profileSwitcherBtn}
            activeOpacity={0.75}
            onPress={() => setShowSwitcher(true)}
          >
            {(() => {
              const active = profiles.find(p => p.profileId === activeProfileId);
              return (
                <>
                  <Text style={s.profileSwitcherAvatar}>{active?.avatar || '🧑'}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.profileSwitcherName} numberOfLines={1}>
                      {active?.displayName || t('home.profile')}
                    </Text>
                    {profiles.length > 1 && (
                      <Text style={s.profileSwitcherHint}>{t('home.switch')}</Text>
                    )}
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </View>

        {/* Profile switcher sheet */}
        <ProfileSwitcherSheet
          visible={showSwitcher}
          onClose={() => setShowSwitcher(false)}
          onAddNew={() => navigation.navigate('AddEditProfile')}
        />

        {/* ── Location Permission Banner — hiện 1 lần/ngày nếu chưa cấp quyền ── */}
        {showLocBanner && (
          <View style={s.locBanner}>
            <Text style={s.locBannerIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.locBannerTitle}>{t('home.locationPermission')}</Text>
              <Text style={s.locBannerBody}>
                {t('home.locationBody')}
              </Text>
              <View style={s.locBannerActions}>
                <TouchableOpacity style={s.locBannerBtn} onPress={handleAllowLocation} activeOpacity={0.8}>
                  <Text style={s.locBannerBtnText}>{t('home.allow')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDismissLocBanner} activeOpacity={0.7}>
                  <Text style={s.locBannerDismiss}>{t('home.later')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {weatherData ? (
          <TouchableOpacity activeOpacity={0.9} onPress={toggleWeatherDetails}>
            <WeatherAnimationSprite
              icon={icon}
              temperature={weatherData.temperature}
              condition={weatherData.condition}
              feelsLike={weatherData.temperature ? Math.round(weatherData.temperature + (weatherData.humidity > 70 ? 4 : 1)) : null}
              accessory={weatherData.season ? <SeasonBubble season={weatherData.season} size={74} /> : null}
            />
          </TouchableOpacity>
        ) : (
          <View style={s.tempSection}>
            <ActivityIndicator color={C.textMid} size="large" />
          </View>
        )}

        {/* ── Nút mở/thu gọn chi tiết thời tiết ── */}
        {weatherData && (
          <TouchableOpacity
            style={s.detailsToggle}
            activeOpacity={0.75}
            onPress={toggleWeatherDetails}
            accessibilityRole="button"
            accessibilityState={{ expanded: showWeatherDetails }}
          >
            <Text style={s.detailsToggleText}>
              {showWeatherDetails ? t('home.weatherDetailsHide') : t('home.weatherDetailsShow')}
            </Text>
            <Ionicons name={showWeatherDetails ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMid} />
          </TouchableOpacity>
        )}

        {/* ── 3-col Wood Metric Cards ── */}
        {weatherData && showWeatherDetails && (
          <View style={s.woodRow}>
            <WoodMetricCell iconName="Drop"  value={weatherData.humidity}   unit="%"    label={t('home.humidity')}   accentColor="rgba(100,180,255,0.18)" />
            <WoodMetricCell iconName="Wind"  value={weatherData.wind_speed} unit="km/h" label={t('home.wind')} accentColor="rgba(160,220,160,0.18)" />
            <WoodMetricCell iconName="Gauge" value={weatherData.pressure}   unit="hPa"  label={t('home.pressure')} accentColor="rgba(255,180,100,0.18)" />
          </View>
        )}

        {/* ── AQI Card ── */}
        {weatherData && showWeatherDetails && (
          <PaperCard style={s.cardSpacing} innerStyle={{ padding: 20 }}>
            <View style={s.cardRow}>
              <View style={s.rowCenter}>
                <Ionicons name="leaf-outline" size={18} color={C.textMid} />
                <Text style={s.cardLabel}> {t('home.airQuality')}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: aqi.bgColor, borderColor: aqi.color }]}>
                <Text style={[s.cardBadge, { color: aqi.textColor }]}>{aqi.label}</Text>
              </View>
            </View>
            <View style={s.metricReadoutRow}>
              <Text style={s.metricReadoutLabel}>{t('home.currentLevel')}</Text>
              <Text style={[s.metricReadoutValue, { color: aqi.textColor }]}>
                <Text style={s.metricPrefix}>AQI </Text>
                {Math.round(weatherData.aqi)}
              </Text>
            </View>
            <MetricScaleBar
              value={weatherData.aqi}
              max={300}
              color={aqi.color}
              labels={['0', '50', '100', '150', '200', '300']}
            />
          </PaperCard>
        )}

        {/* ── UV Card ── */}
        {weatherData && showWeatherDetails && (
          <PaperCard style={s.cardSpacing} innerStyle={{ padding: 20 }}>
            <View style={s.cardRow}>
              <View style={s.rowCenter}>
                <Ionicons name="sunny-outline" size={18} color={C.textMid} />
                <Text style={s.cardLabel}> {t('home.uvIndex')}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: uv.bgColor, borderColor: uv.color }]}>
                <Text style={[s.cardBadge, { color: uv.textColor }]}>
                  {weatherData.uv_index?.toFixed(1)} · {uv.label}
                </Text>
              </View>
            </View>
            <View style={s.metricReadoutRow}>
              <Text style={s.metricReadoutLabel}>{t('home.scalePosition')}</Text>
              <Text style={[s.metricReadoutValue, { color: uv.textColor }]}>
                <Text style={s.metricPrefix}>UV </Text>
                {weatherData.uv_index?.toFixed(1)}
              </Text>
            </View>
            <MetricScaleBar
              value={weatherData.uv_index ?? 0}
              max={11}
              color={uv.color}
              labels={['0', '2', '5', '7', '10', '11+']}
            />
          </PaperCard>
        )}

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Chế độ tìm món: Gợi ý cho tôi / Từ tủ lạnh ── */}
        <Text style={s.filtersEyebrow}>{t('home.modeTitle')}</Text>
        <View style={s.modeRow}>
          {[
            { k: 'suggest', emoji: '✨', title: t('home.modeSuggest'), sub: t('home.modeSuggestSub') },
            { k: 'fridge',  emoji: '🧊', title: t('home.modeFridge'),  sub: t('home.modeFridgeSub') },
          ].map(m => {
            const on = searchMode === m.k;
            return (
              <TouchableOpacity
                key={m.k}
                style={[s.modeCard, on && s.modeCardOn]}
                activeOpacity={0.85}
                onPress={() => chooseMode(m.k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={s.modeEmoji}>{m.emoji}</Text>
                <Text style={[s.modeTitle, on && s.modeTitleOn]}>{m.title}</Text>
                <Text style={s.modeSub}>{m.sub}</Text>
                {m.k === 'fridge' && basketBadge > 0 && (
                  <View style={s.modeBadge}><Text style={s.badgeText}>{basketBadge}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Banner mời cập nhật khẩu vị (user cũ chưa làm onboarding) ── */}
        {!tasteBannerHidden && shouldShowTasteBanner(profile) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TasteOnboarding')}
            style={s.tasteBanner}
          >
            <Text style={s.tasteBannerEmoji}>🍜</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.tasteBannerTitle}>{t('onboarding.banner.title')}</Text>
              <Text style={s.tasteBannerBody}>{t('onboarding.banner.body')}</Text>
            </View>
            <TouchableOpacity
              hitSlop={10}
              onPress={() => { setTasteBannerHidden(true); dismissTasteBanner().catch(() => {}); }}
            >
              <Text style={s.tasteBannerDismiss}>{t('onboarding.banner.dismiss')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Selection Toggles ── */}
        <View style={s.filtersContainer}>
          <Text style={s.filtersEyebrow}>{t('home.searchOptions')}</Text>

          {/* Dish Type Options */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersScrollContent}
            style={s.filtersScroll}
          >
            {[
              { k: 'all',       l: t('home.all') },
              { k: 'soup',      l: t('home.soup') },
              { k: 'main_dish', l: t('home.mainDish') },
            ].map(({ k, l }) => (
              <TouchableOpacity
                key={k}
                onPress={() => setDishFilter(k)}
                activeOpacity={0.78}
              >
                <ImageBackground
                  source={dishFilter === k ? ASSETS.wood : ASSETS.paper}
                  style={[s.pillBtn, dishFilter === k ? s.pillBtnActive : null]}
                  imageStyle={s.pillBtnImg}
                  resizeMode="cover"
                >
                  <View style={dishFilter === k ? s.pillOverlayActive : s.pillOverlayInactive}>
                    <Text style={dishFilter === k ? s.pillTextActive : s.pillText}>{l}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Dụng cụ bếp hôm nay (chi phí & thời gian lọc ở danh sách kết quả) ── */}
        <MealFilterPanel value={mealFilters} onChange={updateMealFilters} />

        {/* ── Search CTA ── */}
        <View style={{ marginHorizontal: 24, marginTop: 16 }}>
          <WoodButton
            title={searchMode === 'fridge' ? t('home.ctaFridge') : t('home.ctaSuggest')}
            onPress={goSearch}
            isLoading={isLoadingRef.current}
          />
        </View>

      </ScrollView>
    </ScreenBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: {
    paddingBottom: 28,
  },

  skyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  // ── Location banner
  locBanner: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(239,246,255,0.95)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(96,165,250,0.45)',
    padding: 14,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  locBannerIcon: { fontSize: 28, marginTop: 2 },
  locBannerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: C.text,
    marginBottom: 4,
  },
  locBannerBody: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 14,
    color: C.textMid,
    lineHeight: 20,
  },
  locBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  locBannerBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locBannerBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  locBannerDismiss: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: C.textLight,
    textDecorationLine: 'underline',
  },

  // ── Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12,
  },
  locationLabel: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: C.woodDark, letterSpacing: 0.3,
  },
  dateLabel: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 16,
    color: C.text, marginTop: 2,
  },
  profileBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: C.borderLight,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },

  // ── Profile Switcher Button ──
  profileSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.5)',
    maxWidth: 150,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8, shadowRadius: 5, elevation: 2,
  },
  profileSwitcherAvatar: { fontSize: 20 },
  profileSwitcherName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: C.text,
    maxWidth: 80,
  },
  profileSwitcherHint: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    color: C.textLight,
  },

  // ── Temperature
  tempSection: { alignItems: 'center', paddingTop: 6, paddingBottom: 10 },
  tempIcon:  { fontSize: 56, marginBottom: -4 },
  tempRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  tempNum: {
    fontFamily: 'Nunito_700Bold', fontSize: 92,
    color: C.text, letterSpacing: -3, lineHeight: 100,
  },
  tempDeg: {
    fontFamily: 'Nunito_400Regular', fontSize: 34,
    color: C.woodDark, marginTop: 18,
  },
  condText: {
    fontFamily: 'Caveat_700Bold', fontSize: 22,
    color: C.textMid, marginTop: -4,
  },
  feelsLike: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: C.textLight, marginTop: 4,
  },

  // ── Wood metric row
  woodRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 24, marginTop: 12,
  },
  woodCell: {
    flex: 1,
    height: 118,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(160,120,74,0.3)',
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 7,
  },
  woodCellImg: { borderRadius: 18, opacity: 0.88 },
  woodCellOverlay: {
    backgroundColor: 'rgba(15,7,2,0.32)',
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 13,
    justifyContent: 'space-between',
  },
  woodIconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  woodDivider: {
    height: 1,
    backgroundColor: 'rgba(255,240,200,0.12)',
    marginVertical: 7,
    marginHorizontal: -2,
  },
  woodLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: '#FDF5E6', // Old Lace - a very warm white
    opacity: 0.55,
    letterSpacing: 0.8,
  },
  woodValCol: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  woodVal: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: '#FFF9EB',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  woodUnit: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    color: '#FDF5E6',
    opacity: 0.55,
    marginTop: 1,
    letterSpacing: 0.3,
  },

  // ── Paper card
  paperCard: {
    marginHorizontal: 16,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 4,
  },
  paperCardImg:   { borderRadius: 18, opacity: 0.88 },
  paperCardInner: { backgroundColor: 'rgba(255,255,255,0.22)', padding: 14 },
  cardSpacing:    { marginTop: 16, marginHorizontal: 24 },

  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: C.textMid,
  },
  cardBadge: {
    fontFamily: 'Nunito_700Bold', fontSize: 13,
    color: C.text,
  },
  metricReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  metricReadoutLabel: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 14,
    color: C.textLight,
  },
  metricReadoutValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: C.text,
  },
  metricScaleTrack: {
    position: 'relative',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(92,58,30,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(141,110,99,0.18)',
    overflow: 'visible',
  },
  metricScaleFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricScaleThumb: {
    position: 'absolute', top: '50%', width: 22, height: 22,
    marginTop: -11, marginLeft: -11,
    borderRadius: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  metricScaleThumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricScaleTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 1,
  },
  metricScaleTick: {
    width: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(141,110,99,0.35)',
  },
  metricScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metricScaleLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: C.textLight,
  },
  metricContainer: {
    marginTop: 8,
  },
  metricPrefix: {
    fontFamily: 'Nunito_600SemiBold', 
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 12, 
    paddingVertical: 4,
    borderRadius: 14, 
    borderWidth: 0.5,
  },

  // ── Season chip
  detailsToggle: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  detailsToggleText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13,
    color: C.textMid,
  },

  // ── Divider
  divider: {
    height: 1, backgroundColor: C.borderLight,
    marginHorizontal: 24, marginVertical: 20,
    opacity: 0.4,
  },

  // ── Basket
  basketTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 14,
    color: C.text,
  },
  basketSub: {
    fontFamily: 'Caveat_400Regular', fontSize: 13,
    color: C.textLight, marginTop: 2,
  },
  basketIconWrap: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(200,169,110,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,110,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sticky note hint — TÁCH RA khỏi card, gắn sát dưới
  basketHintWrap: {
    marginHorizontal: 28,          // thụt vào 4px mỗi bên so với card (24+4)
    marginTop: 0,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 12,
    backgroundColor: 'rgba(254,243,199,0.88)',
    borderWidth: 1,
    borderTopWidth: 0,             // liền mạch với card phía trên
    borderColor: 'rgba(200,169,110,0.45)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  basketHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  basketHintCat: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  basketHintEyebrow: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: '#92400E',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  basketHintText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  basketHintAccent: {
    fontFamily: 'Caveat_700Bold',
    color: '#92400E',
    textDecorationLine: 'underline',
  },

  // ── Badge
  badge: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 8,
  },
  badgeText: {
    fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#FFFFFF',
  },

  // ── Chevron
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  cardTrailingIcon: {
    marginLeft: 12,
    paddingRight: 4,
  },

  // ── Chế độ tìm món
  modeRow: { flexDirection: 'row', gap: 12, marginHorizontal: 24, marginBottom: 8 },
  modeCard: {
    flex: 1, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5, borderColor: C.borderLight,
  },
  modeCardOn: { borderColor: C.primary, backgroundColor: '#FFF8EA' },
  modeEmoji: { fontSize: 26, marginBottom: 6 },
  modeTitle: { fontFamily: 'BeVietnamPro-Bold', fontSize: 15, color: C.textMid },
  modeTitleOn: { color: C.woodDark },
  modeSub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 17 },
  modeBadge: {
    position: 'absolute', top: 10, right: 10, minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },

  // ── Banner cập nhật khẩu vị
  tasteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 24, marginTop: 20, padding: 14, borderRadius: 16,
    backgroundColor: '#FFF8EA', borderWidth: 1.5, borderColor: C.primary,
  },
  tasteBannerEmoji: { fontSize: 28 },
  tasteBannerTitle: { fontFamily: 'BeVietnamPro-Bold', fontSize: 15, color: C.woodDark },
  tasteBannerBody: { fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: C.textMid, marginTop: 2 },
  tasteBannerDismiss: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12, color: C.textLight },

  // ── Selection Toggles (Pill style)
  filtersContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  filtersEyebrow: {
    fontFamily: 'Nunito_700Bold', 
    fontSize: 12, 
    color: C.textLight, 
    letterSpacing: 1.2, 
    textTransform: 'uppercase',
    marginHorizontal: 24,
    marginBottom: 12,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersScrollContent: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'center',
  },
  pillBtn: {
    borderRadius: 24, 
    overflow: 'hidden',
    borderWidth: 1, 
    borderColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
    minWidth: 90,
  },
  pillBtnActive: {
    borderWidth: 1.5, 
    borderColor: C.woodDark,
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
  pillBtnImg: { 
    borderRadius: 24 
  },
  pillOverlayInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  pillOverlayActive: {
    backgroundColor: 'rgba(92,58,30,0.18)',
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillText: {
    fontFamily: 'Nunito_600SemiBold', 
    fontSize: 14,
    color: C.textMid,
  },
  pillTextActive: {
    fontFamily: 'Nunito_700Bold', 
    fontSize: 14,
    color: C.woodDark,
  },
  pillDivider: {
    width: 1, 
    height: 24, 
    backgroundColor: C.borderLight, 
    marginHorizontal: 2,
  },
  filterFlagBase: {
    width: 22,
    height: 16,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92,58,30,0.10)',
    marginRight: 8,
    flexShrink: 0,
  },
  filterFlagGlobal: {
    backgroundColor: C.accentBlue,
  },
  filterFlagVN: {
    backgroundColor: '#C53B2B',
  },
  filterFlagStar: {
    color: '#F7CE46',
    fontSize: 8,
    lineHeight: 9,
    marginTop: -1,
  },
});

export default HomeScreen;
