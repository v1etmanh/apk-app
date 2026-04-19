import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../store/useAppStore';
import { C, R, F, shadow } from '../theme';

// ── DoodlePad tokens ────────────────────────────────────────────────────────
const DP = {
  primary:'#60A5FA', primaryDk:'#3B82F6', secondary:'#4ADE80',
  tertiary:'#FBBF24', error:'#F87171',
  base:'#FFFFF0', surface:'#FFFFFF',
  textPri:'#1E1E1E', textSec:'#6B7280',
  border:'#E5E7EB', radiusMd:16, radiusLg:24, radiusFull:9999,
};
const dpSm = { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:1 };
const dpMd = { shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.08, shadowRadius:8, elevation:3 };

const DIET_LABEL = { omnivore:'Ăn tất cả', vegetarian:'Chay', vegan:'Thuần chay', pescatarian:'Ăn cá' };
const ACTIVITY_LABEL = { sedentary:'Ít vận động', lightly_active:'Nhẹ nhàng', moderately_active:'Vừa phải', very_active:'Nhiều vận động' };
const GENDER_ICON = { male:'👨', female:'👩', other:'🧑' };

// ── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, color }) => (
  <View style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

// ── Menu Item ───────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onPress, danger }) => (
  <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.75}>
    <View style={[s.menuIcon, { backgroundColor: danger ? '#FEE2E2' : 'rgba(96,165,250,0.12)' }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </View>
    <View style={{ flex:1, marginLeft:14 }}>
      <Text style={[s.menuLabel, danger && { color: DP.error }]}>{label}</Text>
      {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
    </View>
    <Text style={s.menuArrow}>›</Text>
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { profile, latestMetrics, tasteProfile } = useAppStore();

  let bmi = null, bmiColor = DP.primary, bmiLabel = 'N/A';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    bmi = (latestMetrics.weight_kg / (h * h)).toFixed(1);
    if (bmi < 18.5)    { bmiColor = '#2196B0'; bmiLabel = 'Thiếu cân'; }
    else if (bmi < 25) { bmiColor = DP.secondary; bmiLabel = 'Bình thường'; }
    else if (bmi < 30) { bmiColor = DP.tertiary;  bmiLabel = 'Thừa cân'; }
    else               { bmiColor = DP.error;      bmiLabel = 'Béo phì'; }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />

      {/* ── Hero — DoodlePad sky-blue gradient ── */}
      <LinearGradient colors={['#3B82F6', '#60A5FA', '#93C5FD']}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.hero}>
        {/* Decorative doodle circles */}
        <View style={s.doodleCircle1} /><View style={s.doodleCircle2} />
        <View style={s.avatarWrap}>
          <Text style={s.avatarEmoji}>{GENDER_ICON[profile?.gender] || '👤'}</Text>
        </View>
        <Text style={s.heroAge}>{profile?.age ? `${profile.age} tuổi` : 'Chưa thiết lập'}</Text>
        <View style={s.heroPills}>
          {profile?.diet_type && (
            <View style={s.heroPill}><Text style={s.heroPillText}>{DIET_LABEL[profile.diet_type]}</Text></View>
          )}
          {profile?.activity_level && (
            <View style={s.heroPill}><Text style={s.heroPillText}>{ACTIVITY_LABEL[profile.activity_level]}</Text></View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>
        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          <StatCard label="Cân nặng" value={latestMetrics?.weight_kg ?? '–'} unit="kg" color="#2196B0" />
          <StatCard label="Chiều cao" value={latestMetrics?.height_cm ?? '–'} unit="cm" color={DP.primary} />
          <StatCard label={bmiLabel} value={bmi ?? '–'} unit="" color={bmiColor} />
        </View>

        {/* ── Menu ── */}
        <View style={s.menuSection}>
          <Text style={s.sectionTitle}>Hồ sơ của tôi</Text>
          <View style={s.menuCard}>
            <MenuItem icon="👤" label="Thông tin cá nhân"
              sub={profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type]||''}` : 'Chưa có dữ liệu'}
              onPress={() => navigation.getParent()?.navigate('EditPersonal')} />
            <View style={s.divider} />
            <MenuItem icon="⚖️" label="Chỉ số cơ thể"
              sub={latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa có dữ liệu'}
              onPress={() => navigation.getParent()?.navigate('BodyMetrics')} />
            <View style={s.divider} />
            <MenuItem icon="⚠️" label="Dị ứng & Chế độ ăn"
              sub="Quản lý thực phẩm cần tránh"
              onPress={() => navigation.getParent()?.navigate('Allergy')} />
            <View style={s.divider} />
            
           <MenuItem icon="👅" label="Khẩu vị của tôi   qdsad"
  onPress={() => navigation.getParent()?.navigate('TasteProfile')} />
          </View>
        </View>
        <View style={{ height:32 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root:          { flex:1, backgroundColor: DP.base },

  // Hero
  hero:          { paddingTop:44, paddingBottom:32, alignItems:'center', overflow:'hidden', position:'relative' },
  doodleCircle1: { position:'absolute', width:120, height:120, borderRadius:60,
                   backgroundColor:'rgba(255,255,255,0.08)', top:-20, right:-30 },
  doodleCircle2: { position:'absolute', width:80, height:80, borderRadius:40,
                   backgroundColor:'rgba(255,255,255,0.08)', bottom:0, left:-20 },
  avatarWrap:    { width:88, height:88, borderRadius:44, backgroundColor:'rgba(255,255,255,0.25)',
                   justifyContent:'center', alignItems:'center', marginBottom:12,
                   borderWidth:3, borderColor:'rgba(255,255,255,0.6)', borderStyle:'dashed' },
  avatarEmoji:   { fontSize:48 },
  heroAge:       { fontSize:22, fontWeight:'800', color:'#fff' },
  heroPills:     { flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap', justifyContent:'center', paddingHorizontal:24 },
  heroPill:      { backgroundColor:'rgba(255,255,255,0.22)', borderRadius: DP.radiusFull,
                   paddingHorizontal:14, paddingVertical:6, borderWidth:1, borderColor:'rgba(255,255,255,0.4)', borderStyle:'dashed' },
  heroPillText:  { fontSize:13, color:'#fff', fontWeight:'700' },

  // Stats
  statsRow:      { flexDirection:'row', gap:10, margin:16 },
  statCard:      { flex:1, backgroundColor: DP.surface, borderRadius: DP.radiusLg, padding:14,
                   alignItems:'center', borderWidth:2, borderColor: DP.border, borderStyle:'dashed', ...dpSm },
  statValue:     { fontSize:22, fontWeight:'800' },
  statUnit:      { fontSize:13, color: DP.textSec, marginTop:1 },
  statLabel:     { fontSize:12, color: DP.textSec, marginTop:4, textAlign:'center' },

  // Menu
  menuSection:   { marginHorizontal:16 },
  sectionTitle:  { fontSize:13, fontWeight:'700', color: DP.textSec,
                   textTransform:'uppercase', letterSpacing:0.8, marginBottom:10, marginLeft:4 },
  menuCard:      { backgroundColor: DP.surface, borderRadius: DP.radiusLg,
                   borderWidth:2, borderColor: DP.border, borderStyle:'dashed',
                   overflow:'hidden', ...dpSm },
  menuRow:       { flexDirection:'row', alignItems:'center', paddingVertical:15, paddingHorizontal:16 },
  menuIcon:      { width:44, height:44, borderRadius: DP.radiusMd, justifyContent:'center', alignItems:'center' },
  menuLabel:     { fontSize:16, fontWeight:'700', color: DP.textPri },
  menuSub:       { fontSize:13, color: DP.textSec, marginTop:2 },
  menuArrow:     { fontSize:22, color: DP.border, fontWeight:'300' },
  divider:       { height:1.5, backgroundColor: DP.border, marginLeft:74, borderStyle:'dashed' },
});

export default ProfileScreen;
