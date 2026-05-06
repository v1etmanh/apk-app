import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar, ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  saveSession, saveDishesToSession,
  loadSessions, loadDishesBySession,
  getWeatherCache, setWeatherCache, setSetting,
  getRecentDishIds, saveRecentDishesCache, loadRecentDishesCache,getSetting,
} from '../utils/database';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import WoodButton from '../components/ui/WoodButton';
import WeatherAnimationSprite from '../components/ui/WeatherAnimationSprite';
import ProfileSwitcherSheet from '../components/ProfileSwitcherSheet';
import { Drop } from 'phosphor-react-native/lib/module/icons/Drop';
import { Wind } from 'phosphor-react-native/lib/module/icons/Wind';
import { Gauge } from 'phosphor-react-native/lib/module/icons/Gauge';

// ── Assets ────────────────────────────────────────────────────────────────────
const ASSETS = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

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
const aqiInfo = (aqi) => {
  if (aqi <= 50)  return { label: 'Tốt',        color: C.accentGreen, textColor: '#275231', bgColor: 'rgba(74, 124, 89, 0.12)' };
  if (aqi <= 100) return { label: 'Trung bình', color: C.amber,       textColor: '#8A5D00', bgColor: 'rgba(200, 134, 10, 0.12)' };
  if (aqi <= 150) return { label: 'Không tốt',  color: '#C8601A',     textColor: '#9E450E', bgColor: 'rgba(200, 96, 26, 0.12)' };
  return               { label: 'Nguy hiểm',    color: '#B84040',     textColor: '#8C2B2B', bgColor: 'rgba(184, 64, 64, 0.12)' };
};

const uvInfo = (uv) => {
  if (uv <= 2)  return { label: 'Thấp',       color: C.accentGreen, textColor: '#275231', bgColor: 'rgba(74, 124, 89, 0.12)' };
  if (uv <= 5)  return { label: 'Vừa phải',   color: C.amber,       textColor: '#8A5D00', bgColor: 'rgba(200, 134, 10, 0.12)' };
  if (uv <= 7)  return { label: 'Cao',        color: '#C8601A',     textColor: '#9E450E', bgColor: 'rgba(200, 96, 26, 0.12)' };
  if (uv <= 10) return { label: 'Rất cao',    color: '#C06010',     textColor: '#94460A', bgColor: 'rgba(192, 96, 16, 0.12)' };
  return               { label: 'Cực kỳ cao', color: '#B84040',     textColor: '#8C2B2B', bgColor: 'rgba(184, 64, 64, 0.12)' };
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

// ─────────────────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const isLoadingRef       = React.useRef(false);
  const prevBasketCountRef = React.useRef(-1);

  const [refreshing, setRefreshing]     = useState(false);
  const [weatherData, setWeatherData]   = useState(null);
  const [cuisineScope, setCuisineScope] = useState('vietnam');
  const [dishFilter, setDishFilter]     = useState('all');
  const [isDirty, setIsDirty]           = useState(false);
  const [basketBadge, setBasketBadge]   = useState(0);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsDirty(true);
  }, [cuisineScope, dishFilter]);

  const {
    profile, latestMetrics, setRankedDishes,
    location, setLocation, allergies, setCurrentSessionId,
    marketBasket, maxPrepTime, costPreference,
    profiles, activeProfileId,
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
    api.get(`/api/v1/challenge?lat=${lat}&lon=${lon}`)
      .then(r => setChallengeTitle(r.data?.challenge_dish?.title || ''))
      .catch(() => {});
    loadRecentDishesCache().then(cached => {
      if (cached.length > 0) setRankedDishes(cached);
    });
    fetchWeather(lat, lon);
  }, []));

  const getUserLocation = async () => {
    try {
      // [FIX ID-M010] Thêm await + khai báo const — tránh implicit global & Promise object
      // [INFO ID-M018] GPS real-time bị comment out có chủ ý (cache only). Uncomment khi release.
      // const { status } = await Location.requestForegroundPermissionsAsync();
      // if (status !== 'granted') return null;
      // const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // return { lat: loc.coords.latitude, lon: loc.coords.longitude };
      const latStr = await getSetting('last_known_lat');
      const lonStr = await getSetting('last_known_lon');
      const lat = latStr ? Number(latStr) : 16.047;
      const lon = lonStr ? Number(lonStr) : 108.206;
      return { lat, lon };
    } catch { return null; }
  };

  const gridKey = (lat, lon) => `${Math.round(Number(lat) * 10) / 10}:${Math.round(Number(lon) * 10) / 10}`;

  const fetchWeather = async (lat, lon) => {
    const loc = normalizeLocation({ lat, lon });
    const key = gridKey(loc.lat, loc.lon);
    const cached = await getWeatherCache(key);
    if (cached?.temperature != null) { setWeatherData(cached); return cached; }
    try {
      const res = await api.get(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
      const hr = new Date().getHours();
      await setWeatherCache(key, res.data, hr >= 6 && hr < 22 ? 30 : 60);
      setWeatherData(res.data);
      return res.data;
    } catch {
      const fb = { temperature: 30, condition: 'Không rõ (offline)', humidity: 70, wind_speed: 10, aqi: 85, uv_index: 5, pressure: 1010, season: 'summer' };
      setWeatherData(fb);
      return fb;
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
    const personal = {
      age: profile?.age || 25,
      gender: profile?.gender || 'female',
      height: latestMetrics?.height_cm || 160,
      weight: latestMetrics?.weight_kg || 55,
      diet_type: profile?.diet_type || 'omnivore',
      dietary_goal: profile?.dietary_goal || 'maintenance',
      activity_level: profile?.activity_level || 'moderately_active',
      health_condition: profile?.health_condition || [],
      taste_preference: profile?.taste_preference || [],
      allergies: allergies || [],
      max_prep_time: maxPrepTime ?? 60,
    };
    const basket = marketBasket.isSkipped
      ? { is_skipped: true, selected_ingredient_ids: [], boost_strategy: 'none' }
      : { is_skipped: false, selected_ingredient_ids: marketBasket.selectedIngredients, boost_strategy: marketBasket.boostStrategy };
    navigation.navigate('Recommend', {
      searchParams: {
        // [FIX ID-M014] Round về 2 decimal (~1km precision) — đủ recommend theo vùng, không lộ địa chỉ nhà
        lat: Math.round(safeCurrentLocation.lat * 100) / 100,
        lon: Math.round(safeCurrentLocation.lon * 100) / 100,
        weather, personal,
        cuisine_scope: cuisineScope,
        dish_type_filter: dishFilter,
        cost_preference: costPreference,
        market_basket: basket,
        location: safeCurrentLocation,
      },
    });
    setIsDirty(false);
    isLoadingRef.current = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const gps = await getUserLocation();
    const loc = gps || normalizeLocation(location);
    const safeLocation = normalizeLocation(loc);
    if (gps) setLocation(gps);
    await fetchWeather(safeLocation.lat, safeLocation.lon);
    setRefreshing(false);
  };

  const icon = weatherIcon(weatherData?.condition, weatherData?.temperature);
  const aqi  = aqiInfo(weatherData?.aqi ?? 0);
  const uv   = uvInfo(weatherData?.uv_index ?? 0);

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
              <Text style={s.locationLabel}> {location?.province || 'Đang xác định...'}</Text>
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
                      {active?.displayName || 'Hồ sơ'}
                    </Text>
                    {profiles.length > 1 && (
                      <Text style={s.profileSwitcherHint}>Đổi ▾</Text>
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

        {/* ── Main Temperature with Animated Weather Sprite ── */}
        {weatherData ? (
          <WeatherAnimationSprite
            icon={icon}
            temperature={weatherData.temperature}
            condition={weatherData.condition}
            feelsLike={weatherData.temperature ? Math.round(weatherData.temperature + (weatherData.humidity > 70 ? 4 : 1)) : null}
          />
        ) : (
          <View style={s.tempSection}>
            <ActivityIndicator color={C.textMid} size="large" />
          </View>
        )}

        {/* ── 3-col Wood Metric Cards ── */}
        {weatherData ? (
          <View style={s.woodRow}>
            <WoodMetricCell iconName="Drop"  value={weatherData.humidity}   unit="%"    label="Độ ẩm"   accentColor="rgba(100,180,255,0.18)" />
            <WoodMetricCell iconName="Wind"  value={weatherData.wind_speed} unit="km/h" label="Sức gió" accentColor="rgba(160,220,160,0.18)" />
            <WoodMetricCell iconName="Gauge" value={weatherData.pressure}   unit="hPa"  label="Áp suất" accentColor="rgba(255,180,100,0.18)" />
          </View>
        ) : (
          <View style={[s.woodRow, { justifyContent: 'center', paddingVertical: 24 }]}>
            <ActivityIndicator color={C.textMid} />
          </View>
        )}

        {/* ── AQI Card ── */}
        {weatherData && (
          <PaperCard style={s.cardSpacing} innerStyle={{ padding: 20 }}>
            <View style={s.cardRow}>
              <View style={s.rowCenter}>
                <Ionicons name="leaf-outline" size={18} color={C.textMid} />
                <Text style={s.cardLabel}> Chất lượng không khí</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: aqi.bgColor, borderColor: aqi.color }]}>
                <Text style={[s.cardBadge, { color: aqi.textColor }]}>{aqi.label}</Text>
              </View>
            </View>
            <View style={s.metricReadoutRow}>
              <Text style={s.metricReadoutLabel}>Mức hiện tại</Text>
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
        {weatherData && (
          <PaperCard style={s.cardSpacing} innerStyle={{ padding: 20 }}>
            <View style={s.cardRow}>
              <View style={s.rowCenter}>
                <Ionicons name="sunny-outline" size={18} color={C.textMid} />
                <Text style={s.cardLabel}> Chỉ số UV</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: uv.bgColor, borderColor: uv.color }]}>
                <Text style={[s.cardBadge, { color: uv.textColor }]}>
                  {weatherData.uv_index?.toFixed(1)} · {uv.label}
                </Text>
              </View>
            </View>
            <View style={s.metricReadoutRow}>
              <Text style={s.metricReadoutLabel}>Vị trí trên thang đo</Text>
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

        {/* ── Season chip ── */}
        {weatherData?.season && (
          <View style={s.seasonChip}>
            <Text style={s.seasonText}>
              {weatherData.season === 'summer' ? '🌞 Mùa hè' :
               weatherData.season === 'winter' ? '❄️ Mùa đông' :
               weatherData.season === 'spring' ? '🌸 Mùa xuân' : '🍂 Mùa thu'}
            </Text>
          </View>
        )}

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Challenge Banner ── */}
        {challengeTitle !== '' && (
          <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('CookingChallenge')}>
            <PaperCard style={[s.cardSpacing, s.challengeBorder]} innerStyle={{ padding: 20 }}>
              <View style={s.rowCenter}>
                <Ionicons name="trophy-outline" size={24} color={C.amber} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.challengeEyebrow}>THỬ THÁCH HÔM NAY</Text>
                  <Text style={s.challengeTitle} numberOfLines={1}>{challengeTitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.amber} style={s.cardTrailingIcon} />
              </View>
            </PaperCard>
          </TouchableOpacity>
        )}

        {/* ── Basket CTA ── */}
        <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('MarketBasket')}>
          <PaperCard style={s.cardSpacing} innerStyle={{ padding: 20 }}>
            <View style={s.rowCenter}>
              <Ionicons name="cart-outline" size={24} color={C.text} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.basketTitle}>
                  {basketBadge > 0 ? `Đã chọn ${basketBadge} nguyên liệu` : 'Bạn đã mua gì hôm nay?'}
                </Text>
                <Text style={s.basketSub}>Tap để cập nhật giỏ hàng</Text>
              </View>
              {basketBadge > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{basketBadge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={C.textLight} style={s.cardTrailingIcon} />
            </View>
          </PaperCard>
        </TouchableOpacity>

        {/* ── Selection Toggles (Two distinct rows) ── */}
        <View style={s.filtersContainer}>
          <Text style={s.filtersEyebrow}>TÙY CHỌN TÌM KIẾM</Text>
          
          {/* Row 1: Cuisine Options */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={s.filtersScrollContent}
            style={s.filtersScroll}
          >
            {[{ k: 'vietnam', l: 'Việt Nam', flagCode: 'VN' }, { k: 'global', l: 'Toàn cầu', flagCode: 'GLOBAL' }].map(({ k, l, flagCode }) => (
              <TouchableOpacity
                key={k}
                onPress={() => setCuisineScope(k)}
                activeOpacity={0.78}
              >
                <ImageBackground 
                  source={cuisineScope === k ? ASSETS.wood : ASSETS.paper} 
                  style={[s.pillBtn, cuisineScope === k ? s.pillBtnActive : null]} 
                  imageStyle={s.pillBtnImg} 
                  resizeMode="cover"
                >
                  <View style={cuisineScope === k ? s.pillOverlayActive : s.pillOverlayInactive}>
                    <View style={s.pillContent}>
                      <FilterFlagMark code={flagCode} />
                      <Text style={cuisineScope === k ? s.pillTextActive : s.pillText}>{l}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Row 2: Dish Type Options */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={[s.filtersScrollContent, { paddingTop: 0 }]}
            style={[s.filtersScroll, { marginTop: 12 }]}
          >
            {[
              { k: 'all',       l: '🍽️ Tất cả' },
              { k: 'soup',      l: '🥣 Canh' },
              { k: 'main_dish', l: '🍖 Món mặn' },
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

        {/* ── Search CTA ── */}
        <View style={{ marginHorizontal: 24, marginTop: 16 }}>
          <WoodButton
            title={isDirty ? '✨ Tìm lại với bộ lọc mới' : '🔍 Tìm món cho tôi'}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.28)',
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
  seasonChip: {
    alignSelf: 'center', 
    marginTop: 16, 
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 18, 
    paddingVertical: 8,
    // Sụbtle shadow for high-end look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  seasonText: {
    fontFamily: 'Caveat_700Bold', 
    fontSize: 16,
    color: C.textMid,
    letterSpacing: 0.3,
  },

  // ── Divider
  divider: {
    height: 1, backgroundColor: C.borderLight,
    marginHorizontal: 24, marginVertical: 20,
    opacity: 0.4,
  },

  // ── Challenge
  challengeBorder: { borderColor: C.amber },
  challengeEyebrow: {
    fontFamily: 'Nunito_700Bold', fontSize: 10,
    color: C.amber, letterSpacing: 1, textTransform: 'uppercase',
  },
  challengeTitle: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 14,
    color: C.text, marginTop: 2,
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
