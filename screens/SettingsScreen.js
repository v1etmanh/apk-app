import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getSetting, setSetting, clearAllHistory } from '../utils/database';
import { useAppStore } from '../store/useAppStore';

const COST_OPTIONS = [
  { label: '🌿 Tiết kiệm', value: '1' },
  { label: '💰 Vừa phải',  value: '2' },
  { label: '💎 Thoải mái', value: '3' },
];

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <Text style={st.sectionTitle}>{title}</Text>
);

// ─── Setting card wrapper ─────────────────────────────────────────────────────
const SettingCard = ({ children }) => (
  <View style={st.card}>{children}</View>
);

// ─── Picker row ───────────────────────────────────────────────────────────────
const PickerRow = ({ icon, bg, label, selectedValue, onValueChange, children }) => (
  <View style={st.row}>
    <View style={[st.iconBox, { backgroundColor: bg }]}>
      <Text style={st.iconEmoji}>{icon}</Text>
    </View>
    <Text style={st.rowLabel}>{label}</Text>  {/* flex:1 riêng */}
    <View style={st.pickerWrap}>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange}
        style={st.picker} dropdownIconColor="#60A5FA">
        {children}
      </Picker>
    </View>
  </View>
);
// ─── Action row ──────────────────────────────────────────────────────────────
const ActionRow = ({ icon, bg, label, actionLabel, onPress, danger, last }) => (
  <TouchableOpacity
    style={[st.row, !last && st.rowBorder]}
    onPress={onPress} activeOpacity={0.7}
  >
    <View style={[st.iconBox, { backgroundColor: bg }]}>
      <Text style={st.iconEmoji}>{icon}</Text>
    </View>
    <Text style={[st.rowLabel, { flex: 1 }]}>{label}</Text>
    <View style={[st.actionBadge, danger && st.actionBadgeDanger]}>
      <Text style={[st.actionBadgeText, danger && st.actionBadgeTextDanger]}>{actionLabel}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
const SettingsScreen = () => {
  const [cuisinePreference, setCuisinePreference] = useState('vietnam');
  const [maxCookTime, setMaxCookTime]             = useState('60');
  const [costPreference, setCostPreferenceLocal]  = useState('2');
  const [language, setLanguage]                   = useState('vi');
  const [unitSystem, setUnitSystem]               = useState('metric');
  const { location, setLocation, setCostPreference: setStoreCostPref } = useAppStore();

  useEffect(() => { loadSettings(); }, []);

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
      if (lat && lon) setLocation({ ...location, lat: parseFloat(lat), lon: parseFloat(lon), province: province || location.province });
    } catch (e) { console.error('loadSettings:', e); }
  };

  const save = async (key, val) => {
    try { await setSetting(key, String(val)); }
    catch (e) { Alert.alert('Lỗi', 'Không thể lưu cài đặt'); }
  };

  const handleCuisineChange        = async v => { setCuisinePreference(v); await save('default_cuisine', v); };
  const handleCookTimeChange       = async v => { setMaxCookTime(v);        await save('max_cook_time', v); };
  const handleLanguageChange       = async v => { setLanguage(v);           await save('language', v); };
  const handleUnitChange           = async v => { setUnitSystem(v);         await save('unit_system', v); };
  const handleCostChange           = async v => { setCostPreferenceLocal(v); setStoreCostPref(Number(v)); await save('cost_preference', v); };

  const clearHistory = () => {
    Alert.alert('Xóa lịch sử', 'Hành động này không thể hoàn tác nhé!', [
      { text: 'Thôi', style: 'cancel' },
      { text: 'Xóa hết', style: 'destructive',
        onPress: async () => {
          try { await clearAllHistory(); Alert.alert('Xong rồi! 🌿', 'Lịch sử đã được xóa sạch'); }
          catch { Alert.alert('Ối!', 'Không thể xóa lịch sử'); }
        }},
    ]);
  };

  const syncIngredients = () => {
    Alert.alert('Thông báo', 'Đang đồng bộ nguyên liệu...');
    setTimeout(() => Alert.alert('Thành công ✓', 'Nguyên liệu đã được cập nhật'), 1000);
  };

  const exportData = () => Alert.alert('Xuất dữ liệu', 'Tính năng sẽ có trong phiên bản tới 🚀', [{ text: 'OK' }]);

  return (
    <ScrollView style={st.root} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerEmoji}>⚙️</Text>
        <Text style={st.headerTitle}>Cài đặt</Text>
        <Text style={st.headerSub}>Tuỳ chỉnh theo ý bạn nhé</Text>
      </View>

      {/* Gợi ý mặc định */}
      <SectionHeader title="🍜 Gợi ý mặc định" />
      <SettingCard>
        <PickerRow icon="🍜" bg="#FFF3E0" label="Phạm vi ẩm thực"
          selectedValue={cuisinePreference} onValueChange={handleCuisineChange}>
          <Picker.Item label="🇻🇳 Việt Nam"  value="vietnam" />
          <Picker.Item label="🌍 Toàn cầu"  value="global" />
          <Picker.Item label="🇯🇵 Nhật Bản"  value="japan" />
          <Picker.Item label="🇹🇭 Thái Lan"  value="thailand" />
          <Picker.Item label="🇮🇹 Ý"          value="italy" />
          <Picker.Item label="🇰🇷 Hàn Quốc"  value="korea" />
        </PickerRow>
        <PickerRow icon="💰" bg="#F0FDF4" label="Mức chi phí"
          selectedValue={costPreference} onValueChange={handleCostChange}>
          {COST_OPTIONS.map(o => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
        </PickerRow>
        <PickerRow icon="⏱️" bg="#EFF6FF" label="Thời gian nấu tối đa"
          selectedValue={maxCookTime} onValueChange={handleCookTimeChange}>
          {['15','30','45','60','75','90','115'].map(v => (
            <Picker.Item key={v} label={`${v} phút`} value={v} />
          ))}
        </PickerRow>
      </SettingCard>

      {/* Hiển thị */}
      <SectionHeader title="🌐 Hiển thị" />
      <SettingCard>
        <PickerRow icon="🌐" bg="#F5F3FF" label="Ngôn ngữ"
          selectedValue={language} onValueChange={handleLanguageChange}>
          <Picker.Item label="🇻🇳 Tiếng Việt" value="vi" />
          <Picker.Item label="🇺🇸 English"     value="en" />
        </PickerRow>
        <PickerRow icon="📏" bg="#FFF7ED" label="Đơn vị đo lường"
          selectedValue={unitSystem} onValueChange={handleUnitChange}>
          <Picker.Item label="Metric (kg, cm)"   value="metric" />
          <Picker.Item label="Imperial (lb, ft)"  value="imperial" />
        </PickerRow>
      </SettingCard>

      {/* Dữ liệu */}
      <SectionHeader title="💾 Dữ liệu" />
      <SettingCard>
        <ActionRow icon="🔄" bg="#F0FDF4" label="Đồng bộ nguyên liệu" actionLabel="Làm mới" onPress={syncIngredients} />
        <ActionRow icon="📤" bg="#EFF6FF" label="Xuất dữ liệu" actionLabel="Xuất" onPress={exportData} />
        <ActionRow icon="🗑️" bg="#FFF1F2" label="Xóa lịch sử" actionLabel="Xóa" onPress={clearHistory} danger last />
      </SettingCard>

      {/* Footer */}
      <View style={st.footer}>
        <View style={st.versionBadge}>
          <Text style={st.versionEmoji}>🌿</Text>
          <Text style={st.versionText}>Phiên bản 1.0.0</Text>
        </View>
        <Text style={st.serverText}>api.wafrs.app</Text>
      </View>
    </ScrollView>
  );
};

const st = StyleSheet.create({
  root:                { flex: 1, backgroundColor: '#FFFFF0' },
  content:             { paddingBottom: 48 },
  header:              { alignItems: 'center', paddingTop: 36, paddingBottom: 20,
                         backgroundColor: '#FFFFFF', borderBottomWidth: 2,
                         borderBottomColor: '#E5E7EB', borderStyle: 'dashed', marginBottom: 8 },
  headerEmoji:         { fontSize: 40, marginBottom: 8 },
  headerTitle:         { fontSize: 32, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  headerSub:           { fontSize: 16, color: '#9CA3AF', marginTop: 4, fontFamily: 'Nunito' },
  sectionTitle:        { fontSize: 16, fontWeight: '700', color: '#60A5FA', fontFamily: 'Nunito',
                         marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  card:                { backgroundColor: '#FFFFFF', borderRadius: 24, marginHorizontal: 16,
                         borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
                         overflow: 'hidden',
                         shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                         shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  row:                 { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                         paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowBorder:           { borderBottomWidth: 1 },
  iconBox:             { width: 40, height: 40, borderRadius: 12, alignItems: 'center',
                         justifyContent: 'center', marginRight: 12 },
  iconEmoji:           { fontSize: 18 },
  rowInner:            { flex: 1 },
  rowLabel: { fontSize: 16, color: '#1E1E1E', fontWeight: '600',
             fontFamily: 'Nunito', flex: 1 },
  pickerWrap: { width: 130 }, 
  picker:     { height: 44, width: 130, color: '#60A5FA' },

  pickerItem:          { fontSize: 15, color: '#60A5FA' },
  actionBadge:         { backgroundColor: '#EFF6FF', borderRadius: 9999,
                         paddingHorizontal: 12, paddingVertical: 5 },
  actionBadgeDanger:   { backgroundColor: '#FFF1F2' },
  actionBadgeText:     { fontSize: 13, color: '#60A5FA', fontWeight: '700' },
  actionBadgeTextDanger: { color: '#F87171' },
  footer:              { alignItems: 'center', marginTop: 40, gap: 6 },
  versionBadge:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
                         borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 6, gap: 6 },
  versionEmoji:        { fontSize: 14 },
  versionText:         { fontSize: 14, color: '#4ADE80', fontWeight: '700', fontFamily: 'Nunito' },
  serverText:          { fontSize: 13, color: '#D1D5DB', fontFamily: 'Nunito' },
});

export default SettingsScreen;
