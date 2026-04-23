import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, ImageBackground, Animated, Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { getSetting, setSetting, clearAllHistory } from '../utils/database';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../store/suppabase';   // ← thêm import

// ─── Design Tokens ─────────────────────────────────────────────────
const C = {
  paper:     '#F5EDD6',
  paperDeep: '#EDE0C4',
  ink:       '#3D2B1F',
  inkLight:  '#7B5B3A',
  wood:      '#C8A97E',
  woodDark:  '#9B7355',
  woodDeep:  '#7A5535',
  dashed:    '#C4B49A',
  white:     '#FFFEF9',
  mint:      '#A8D5B5',
  amber:     '#E8C547',
  rose:      '#E8A598',
  skyBlue:   '#A8CEDF',
  danger:    '#D45F5F',
  dangerBg:  '#F5D5D5',
};
const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;

// ─── Wobbly Border ─────────────────────────────────────────────────
const WobblyBorder = ({ width, height, color = C.dashed, sw = 1.8, dash = '5,4' }) => {
  const r = 18, w = width, h = height;
  const p = `M${r},3 Q${w*.5},1 ${w-r},4 Q${w-3},3 ${w-3},${r} Q${w-1},${h*.5} ${w-3},${h-r} Q${w-2},${h-2} ${w-r+2},${h-3} Q${w*.5},${h-1} ${r-1},${h-3} Q2,${h-2} 3,${h-r} Q1,${h*.5} 3,${r} Q2,2 ${r},3 Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={p} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={dash} strokeLinecap="round"/>
    </Svg>
  );
};

// ─── SVG Lined Paper Tag ──────────────────────────────────────────
const LinedPaperTag = ({ width = 110, height = 52, children }) => {
  const lines = [12, 20, 28, 36, 44];
  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} rx={6}
          fill="#EEF4FB" stroke={C.skyBlue} strokeWidth={1} strokeDasharray="3,2"/>
        <Line x1={14} y1={2} x2={14} y2={height-2}
          stroke="#E8B0B0" strokeWidth={0.8} opacity={0.7}/>
        {lines.map(y => (
          <Line key={y} x1={16} y1={y} x2={width-4} y2={y}
            stroke={C.skyBlue} strokeWidth={0.7} opacity={0.55}/>
        ))}
        <Path
          d={`M0,0 Q${width*.15},3 ${width*.3},1 Q${width*.45},3 ${width*.6},0 Q${width*.75},3 ${width*.9},1 Q${width*.96},2 ${width},0`}
          fill="#EEF4FB" stroke={C.skyBlue} strokeWidth={0.5}/>
      </Svg>
      <View style={{ position:'absolute', inset:0, justifyContent:'center',
                     alignItems:'center', paddingHorizontal: 6 }}>
        {children}
      </View>
    </View>
  );
};

// ─── Wood Section Header ──────────────────────────────────────────
const WoodSectionHeader = ({ title, emoji }) => (
  <ImageBackground
    source={require('../assets/textures/wood_light.png')}
    style={st.sectionHeader} resizeMode="cover"
    imageStyle={{ opacity: 0.4 }}
  >
    <View style={st.sectionHeaderInner}>
      <Text style={st.sectionEmoji}>{emoji}</Text>
      <Text style={st.sectionTitle}>{title}</Text>
      <View style={st.nail}/>
      <View style={[st.nail, { right: 10, left: undefined }]}/>
    </View>
  </ImageBackground>
);

// ─── Wavy Row Divider ─────────────────────────────────────────────
const WavyDivider = () => (
  <Svg width={CARD_W - 32} height={8} style={{ marginLeft: 16 }}>
    <Path
      d={`M0,4 Q${(CARD_W-32)*.2},1 ${(CARD_W-32)*.4},4 Q${(CARD_W-32)*.6},7 ${(CARD_W-32)*.8},4 Q${(CARD_W-32)*.9},2 ${CARD_W-32},4`}
      fill="none" stroke={C.dashed} strokeWidth={1} strokeDasharray="3,3"/>
  </Svg>
);

// ─── Picker Row ───────────────────────────────────────────────────
const PickerRow = ({ icon, iconBg, label, selectedValue, onValueChange, children, isLast }) => (
  <>
    <View style={st.row}>
      <View style={[st.iconBox, { backgroundColor: iconBg }]}>
        <Text style={st.iconEmoji}>{icon}</Text>
      </View>
      <Text style={st.rowLabel}>{label}</Text>
      <LinedPaperTag width={116} height={50}>
        <Picker
          selectedValue={selectedValue} onValueChange={onValueChange}
          style={st.pickerInTag} dropdownIconColor={C.inkLight} itemStyle={st.pickerItem}
        >
          {children}
        </Picker>
      </LinedPaperTag>
    </View>
    {!isLast && <WavyDivider/>}
  </>
);

// ─── Action Row ───────────────────────────────────────────────────
const ActionRow = ({ icon, iconBg, label, actionLabel, onPress, danger, isLast }) => (
  <>
    <TouchableOpacity style={st.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[st.iconBox, { backgroundColor: danger ? C.dangerBg : iconBg }]}>
        <Text style={st.iconEmoji}>{icon}</Text>
      </View>
      <Text style={[st.rowLabel, danger && { color: C.danger }]}>{label}</Text>
      <LinedPaperTag width={60} height={36}>
        <Text style={[st.actionText, danger && { color: C.danger }]}>{actionLabel}</Text>
      </LinedPaperTag>
    </TouchableOpacity>
    {!isLast && <WavyDivider/>}
  </>
);

// ─── Main Screen ──────────────────────────────────────────────────
const SettingsScreen = () => {
  const [cuisinePreference, setCuisinePreference] = useState('vietnam');
  const [maxCookTime,       setMaxCookTime]       = useState('60');
  const [costPreference,    setCostPreferenceLocal]= useState('2');
  const [language,          setLanguage]           = useState('vi');
  const [unitSystem,        setUnitSystem]         = useState('metric');
  const { location, setLocation, setCostPreference: setStoreCostPref } = useAppStore();

  const gearRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
    Animated.loop(
      Animated.timing(gearRot, { toValue: 1, duration: 12000, useNativeDriver: false })
    ).start();
  }, []);

  const loadSettings = async () => {
    try {
      const [cuisine, cook, cost, lang, unit, lat, lon, province] = await Promise.all([
        getSetting('default_cuisine'), getSetting('max_cook_time'),
        getSetting('cost_preference'), getSetting('language'),
        getSetting('unit_system'),     getSetting('last_known_lat'),
        getSetting('last_known_lon'),  getSetting('last_known_province'),
      ]);
      setCuisinePreference(cuisine || 'vietnam');
      setMaxCookTime(cook || '60');
      setCostPreferenceLocal(cost || '2');
      setLanguage(lang || 'vi');
      setUnitSystem(unit || 'metric');
      if (lat && lon) setLocation({
        ...location, lat: parseFloat(lat), lon: parseFloat(lon),
        province: province || location?.province,
      });
    } catch (e) { console.error('loadSettings:', e); }
  };

  const save = async (key, val) => {
    try { await setSetting(key, String(val)); }
    catch { Alert.alert('Lỗi', 'Không thể lưu cài đặt'); }
  };

  const handleCuisineChange  = async v => { setCuisinePreference(v);  await save('default_cuisine', v); };
  const handleCookTimeChange = async v => { setMaxCookTime(v);         await save('max_cook_time',  v); };
  const handleLanguageChange = async v => { setLanguage(v);            await save('language',        v); };
  const handleUnitChange     = async v => { setUnitSystem(v);          await save('unit_system',     v); };
  const handleCostChange     = async v => { setCostPreferenceLocal(v); setStoreCostPref(Number(v)); await save('cost_preference', v); };

  const clearHistory = () => {
    Alert.alert('Xóa lịch sử', 'Hành động này không thể hoàn tác nhé!', [
      { text: 'Thôi', style: 'cancel' },
      { text: 'Xóa hết', style: 'destructive', onPress: async () => {
        try { await clearAllHistory(); Alert.alert('Xong rồi! 🌿', 'Lịch sử đã được xóa sạch'); }
        catch { Alert.alert('Ối!', 'Không thể xóa lịch sử'); }
      }},
    ]);
  };

  const syncIngredients = () => {
    Alert.alert('Thông báo', 'Đang đồng bộ nguyên liệu...');
    setTimeout(() => Alert.alert('Thành công ✓', 'Nguyên liệu đã được cập nhật'), 1000);
  };

  const exportData = () => Alert.alert('Xuất dữ liệu', 'Tính năng sẽ có trong phiên bản tới 🚀');

  // ── Logout ──────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn chắc chắn muốn đăng xuất không? 🐱',
      [
        { text: 'Thôi', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            // App.js lắng nghe onAuthStateChange → tự chuyển về LoginScreen
          },
        },
      ]
    );
  };

  const gearDeg = gearRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ImageBackground
      source={require('../assets/textures/paper_cream.png')}
      style={st.root} resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* ── Header ── */}
        <ImageBackground
          source={require('../assets/textures/sky_watercolor.png')}
          style={st.header} resizeMode="cover" imageStyle={{ opacity: 0.45 }}
        >
          <Animated.Text style={[st.headerGear, { transform: [{ rotate: gearDeg }] }]}>⚙️</Animated.Text>
          <Text style={st.headerTitle}>Cài đặt</Text>
          <Text style={st.headerSub}>Tuỳ chỉnh theo ý bạn nhé</Text>
          <Svg width={SW} height={22} style={st.headerWave}>
            <Path
              d={`M0,8 Q${SW*.13},20 ${SW*.27},9 Q${SW*.41},0 ${SW*.55},11 Q${SW*.69},20 ${SW*.83},8 Q${SW*.92},2 ${SW},9 L${SW},22 L0,22 Z`}
              fill={C.paper}/>
          </Svg>
        </ImageBackground>

        {/* ── Section: Gợi ý mặc định ── */}
        <WoodSectionHeader emoji="🍜" title="Gợi ý mặc định"/>
        <View style={st.card}>
          <WobblyBorder width={CARD_W} height={190} color={C.wood} sw={2}/>
          <PickerRow icon="🍜" iconBg="#F5E8D4" label="Phạm vi ẩm thực"
            selectedValue={cuisinePreference} onValueChange={handleCuisineChange}>
            <Picker.Item label="🇻🇳 Việt Nam"  value="vietnam"/>
            <Picker.Item label="🌍 Toàn cầu"   value="global"/>
            <Picker.Item label="🇯🇵 Nhật Bản"  value="japan"/>
            <Picker.Item label="🇹🇭 Thái Lan"  value="thailand"/>
            <Picker.Item label="🇮🇹 Ý"          value="italy"/>
            <Picker.Item label="🇰🇷 Hàn Quốc"  value="korea"/>
          </PickerRow>
          <PickerRow icon="💰" iconBg="#D4EDC4" label="Mức chi phí"
            selectedValue={costPreference} onValueChange={handleCostChange}>
            <Picker.Item label="🌿 Tiết kiệm"  value="1"/>
            <Picker.Item label="💰 Vừa phải"   value="2"/>
            <Picker.Item label="💎 Thoải mái"  value="3"/>
          </PickerRow>
          <PickerRow icon="⏱️" iconBg="#D4EDF7" label="Thời gian nấu tối đa"
            selectedValue={maxCookTime} onValueChange={handleCookTimeChange} isLast>
            {['15','30','45','60','75','90','115'].map(v => (
              <Picker.Item key={v} label={`${v} phút`} value={v}/>
            ))}
          </PickerRow>
        </View>

        {/* ── Section: Hiển thị ── */}
        <WoodSectionHeader emoji="🌐" title="Hiển thị"/>
        <View style={st.card}>
          <WobblyBorder width={CARD_W} height={130} color={C.wood} sw={2}/>
          <PickerRow icon="🌐" iconBg="#E8E4F5" label="Ngôn ngữ"
            selectedValue={language} onValueChange={handleLanguageChange}>
            <Picker.Item label="🇻🇳 Tiếng Việt" value="vi"/>
            <Picker.Item label="🇺🇸 English"     value="en"/>
          </PickerRow>
          <PickerRow icon="📏" iconBg="#F5E8D4" label="Đơn vị đo lường"
            selectedValue={unitSystem} onValueChange={handleUnitChange} isLast>
            <Picker.Item label="Metric (kg, cm)"   value="metric"/>
            <Picker.Item label="Imperial (lb, ft)" value="imperial"/>
          </PickerRow>
        </View>

        {/* ── Section: Dữ liệu ── */}
        <WoodSectionHeader emoji="💾" title="Dữ liệu"/>
        <View style={st.card}>
          <WobblyBorder width={CARD_W} height={180} color={C.wood} sw={2}/>
          <ActionRow icon="🔄" iconBg="#D4EDC4" label="Đồng bộ nguyên liệu"
            actionLabel="Làm mới" onPress={syncIngredients}/>
          <ActionRow icon="📤" iconBg="#D4EDF7" label="Xuất dữ liệu"
            actionLabel="Xuất" onPress={exportData}/>
          <ActionRow icon="🗑️" iconBg={C.dangerBg} label="Xóa lịch sử"
            actionLabel="Xóa" onPress={clearHistory} danger isLast/>
        </View>

        {/* ── Section: Tài khoản ── */}
        <WoodSectionHeader emoji="👤" title="Tài khoản"/>
        <View style={st.card}>
          <WobblyBorder width={CARD_W} height={72} color={C.wood} sw={2}/>
          <ActionRow
            icon="🚪"
            iconBg={C.dangerBg}
            label="Đăng xuất"
            actionLabel="Thoát"
            onPress={handleLogout}
            danger
            isLast
          />
        </View>

        {/* ── Footer ── */}
        <View style={st.footer}>
          <Svg width={120} height={10} style={{ marginBottom: 10 }}>
            <Path d="M0,5 Q30,1 60,5 Q90,9 120,5"
              fill="none" stroke={C.dashed} strokeWidth={1.2} strokeDasharray="4,3"/>
          </Svg>
          <View style={st.versionBadge}>
            <WobblyBorder width={160} height={38} color={C.wood} sw={1.5} dash="4,3"/>
            <Text style={st.versionText}>🌿 Phiên bản 1.0.0</Text>
          </View>
          <Text style={st.serverText}>api.wafrs.app</Text>
          <Text style={st.footerPaw}>🐾 🐾</Text>
        </View>

        <View style={{ height: 48 }}/>
      </ScrollView>
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.paper },
  scroll: { paddingBottom: 40 },

  header:      { alignItems: 'center', paddingTop: 56, paddingBottom: 0, backgroundColor: C.skyBlue },
  headerGear:  { fontSize: 44, marginBottom: 6 },
  headerTitle: { fontFamily: 'Patrick Hand', fontSize: 32, color: C.ink },
  headerSub:   { fontFamily: 'Nunito', fontSize: 14, color: C.inkLight, fontWeight: '600', marginTop: 4, marginBottom: 10 },
  headerWave:  { marginTop: 2 },

  sectionHeader:      { marginTop: 20, marginBottom: 0, height: 44, backgroundColor: C.woodDark, justifyContent: 'center' },
  sectionHeaderInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8 },
  sectionEmoji:       { fontSize: 18 },
  sectionTitle:       { fontFamily: 'Patrick Hand', fontSize: 18, color: C.white, flex: 1 },
  nail:               { position: 'absolute', left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.woodDeep, borderWidth: 1, borderColor: C.amber },

  card: { backgroundColor: C.white, marginHorizontal: 16, borderRadius: 0, paddingVertical: 4,
          shadowColor: C.woodDark, shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  iconBox:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconEmoji: { fontSize: 20 },
  rowLabel:  { flex: 1, fontFamily: 'Patrick Hand', fontSize: 16, color: C.ink },

  pickerInTag: { height: 44, width: 104, color: C.ink },
  pickerItem:  { fontSize: 13, color: C.ink, fontFamily: 'Nunito' },
  actionText:  { fontFamily: 'Patrick Hand', fontSize: 14, color: C.inkLight },

  footer:       { alignItems: 'center', marginTop: 32, gap: 8 },
  versionBadge: { width: 160, height: 38, justifyContent: 'center', alignItems: 'center' },
  versionText:  { fontFamily: 'Patrick Hand', fontSize: 15, color: C.inkLight },
  serverText:   { fontFamily: 'Nunito', fontSize: 12, color: C.dashed, fontWeight: '600' },
  footerPaw:    { fontSize: 18, opacity: 0.35, marginTop: 4 },
});

export default SettingsScreen;