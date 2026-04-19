import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert,
} from 'react-native';
import { loadAllMetrics, saveBodyMetrics } from '../utils/database';
import { useAppStore } from '../store/useAppStore';
import { C, R, F, shadow } from '../theme';

const BMI_INFO = (bmi) => {
  if (!bmi) return { label:'N/A', color:'#9CA3AF', bg:'#F9FAFB', emoji:'⚖️' };
  const b = parseFloat(bmi);
  if (b < 18.5) return { label:'Thiếu cân',  color:'#0EA5E9', bg:'#E0F2FE', emoji:'🌱' };
  if (b < 25)   return { label:'Bình thường', color:'#4ADE80', bg:'#DCFCE7', emoji:'✅' };
  if (b < 30)   return { label:'Thừa cân',    color:'#FBBF24', bg:'#FEF9C3', emoji:'⚠️' };
  return             { label:'Béo phì',      color:'#F87171', bg:'#FEE2E2', emoji:'🚨' };
};

const BodyMetricsScreen = ({ navigation }) => {
  const [metrics, setMetrics] = useState([]);
  const [height, setHeight]   = useState('');
  const [weight, setWeight]   = useState('');
  const [note, setNote]       = useState('');
  const { latestMetrics, setLatestMetrics } = useAppStore();

  useEffect(() => { loadMetrics(); }, []);

  const loadMetrics = async () => {
    try {
      const result = await loadAllMetrics();
      setMetrics(result);
      if (result.length > 0) {
        setLatestMetrics(result[0]);
        setHeight(String(result[0].height_cm));
        setWeight(String(result[0].weight_kg));
      }
    } catch (e) { console.error(e); }
  };

  const calcBMI = (h, w) => {
    if (!h || !w) return null;
    return (parseFloat(w) / ((parseFloat(h)/100)**2)).toFixed(1);
  };

  const handleSave = async () => {
    const h = parseFloat(height), w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      Alert.alert('Oops! 😅', 'Chiều cao và cân nặng phải là số dương nhé!'); return;
    }
    try {
      await saveBodyMetrics({ height_cm:h, weight_kg:w, measured_at:new Date().toISOString(), note:note||'' });
      setNote('');
      await loadMetrics();
      Alert.alert('Đã lưu! 🎉', 'Chỉ số cơ thể đã được cập nhật.');
    } catch (e) { Alert.alert('Oops! 😅', 'Không thể lưu dữ liệu'); }
  };

  const bmi = calcBMI(latestMetrics?.height_cm, latestMetrics?.weight_kg);
  const bmiInfo = BMI_INFO(bmi);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={s.nav}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>📏 Chỉ số cơ thể</Text>
        <View style={{ width:40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* BMI Hero Card */}
        <View style={[s.bmiCard, { backgroundColor:bmiInfo.bg, borderColor:bmiInfo.color }]}>
          <View style={s.bmiLeft}>
            <Text style={s.bmiEmoji}>{bmiInfo.emoji}</Text>
            <Text style={[s.bmiNum, { color:bmiInfo.color }]}>{bmi ?? '–'}</Text>
            <Text style={s.bmiLabel}>BMI</Text>
          </View>
          <View style={s.bmiRight}>
            <View style={[s.bmiStatusPill, { backgroundColor:bmiInfo.color }]}>
              <Text style={s.bmiStatusText}>{bmiInfo.label}</Text>
            </View>
            <Text style={s.bmiSub}>
              {latestMetrics?.weight_kg ? `⚖️ ${latestMetrics.weight_kg} kg` : '–'}
            </Text>
            <Text style={s.bmiSub}>
              {latestMetrics?.height_cm ? `📐 ${latestMetrics.height_cm} cm` : '–'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label:'Cân nặng', val:latestMetrics?.weight_kg, unit:'kg', color:'#60A5FA', emoji:'⚖️' },
            { label:'Chiều cao', val:latestMetrics?.height_cm, unit:'cm', color:'#4ADE80', emoji:'📐' },
            { label:'Lần đo', val:metrics.length, unit:'lần', color:'#FBBF24', emoji:'📊' },
          ].map(({ label, val, unit, color, emoji }) => (
            <View key={label} style={[s.statCard, { borderTopColor:color }]}>
              <Text style={s.statEmoji}>{emoji}</Text>
              <Text style={[s.statNum, { color }]}>{val ?? '–'}</Text>
              <Text style={s.statUnit}>{unit}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>✏️ Cập nhật chỉ số</Text>
          <View style={s.inputRow}>
            {[
              { label:'Chiều cao', val:height, set:setHeight, unit:'cm' },
              { label:'Cân nặng',  val:weight, set:setWeight, unit:'kg' },
            ].map(({ label, val, set, unit }) => (
              <View key={label} style={s.inputGroup}>
                <Text style={s.inputLabel}>{label}</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.input} value={val} onChangeText={set}
                    keyboardType="decimal-pad" placeholder={unit}
                    placeholderTextColor="#9CA3AF" />
                  <Text style={s.inputUnit}>{unit}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.noteWrap}>
            <TextInput style={s.noteInput} value={note} onChangeText={setNote}
              placeholder="📝 Ghi chú (tuỳ chọn)" placeholderTextColor="#9CA3AF"
              multiline maxLength={120} />
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Lưu chỉ số 🎯</Text>
          </TouchableOpacity>
        </View>

        {/* History */}
        {metrics.length > 0 && (
          <View style={s.historyCard}>
            <Text style={s.formTitle}>📅 Lịch sử đo</Text>
            {metrics.slice(0, 6).map((m, i) => {
              const d = new Date(m.measured_at);
              const b = calcBMI(m.height_cm, m.weight_kg);
              const bi = BMI_INFO(b);
              return (
                <View key={i} style={[s.histRow, i < Math.min(metrics.length,6)-1 && s.histDivider]}>
                  <View>
                    <Text style={s.histDate}>{d.getDate()}/{d.getMonth()+1}/{d.getFullYear()}</Text>
                    {m.note ? <Text style={s.histNote}>{m.note}</Text> : null}
                  </View>
                  <View style={s.histRight}>
                    <Text style={s.histWeight}>{m.weight_kg} kg</Text>
                    <View style={[s.histBmiPill, { backgroundColor:bi.bg }]}>
                      <Text style={[s.histBmiText, { color:bi.color }]}>{bi.emoji} BMI {b}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height:40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root:          { flex:1, backgroundColor:'#FFFFF0' },
  nav:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                   paddingHorizontal:16, paddingVertical:14, backgroundColor:'#FFFFFF',
                   borderBottomWidth:2, borderBottomColor:'#E5E7EB', borderStyle:'dashed' },
  back:          { width:44, height:44, justifyContent:'center' },
  backArrow:     { fontSize:22, color:'#60A5FA', fontWeight:'600' },
  navTitle:      { fontSize:20, fontFamily:'Patrick Hand', color:'#1E1E1E' },
  scroll:        { padding:16 },

  bmiCard:       { borderRadius:24, borderWidth:2, padding:20, flexDirection:'row',
                   alignItems:'center', marginBottom:14,
                   shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  bmiLeft:       { alignItems:'center', marginRight:20 },
  bmiEmoji:      { fontSize:32, marginBottom:4 },
  bmiNum:        { fontSize:44, fontFamily:'Patrick Hand', lineHeight:48 },
  bmiLabel:      { fontSize:14, fontFamily:'Nunito', color:'#9CA3AF', fontWeight:'600', letterSpacing:1 },
  bmiRight:      { flex:1, gap:6 },
  bmiStatusPill: { alignSelf:'flex-start', borderRadius:9999, paddingHorizontal:14, paddingVertical:6 },
  bmiStatusText: { fontSize:16, fontFamily:'Nunito', fontWeight:'700', color:'#fff' },
  bmiSub:        { fontSize:16, fontFamily:'Nunito', color:'#6B7280' },

  statsRow:      { flexDirection:'row', gap:10, marginBottom:14 },
  statCard:      { flex:1, backgroundColor:'#FFFFFF', borderRadius:16, padding:12,
                   alignItems:'center', borderTopWidth:3,
                   borderWidth:2, borderColor:'#E5E7EB', borderStyle:'dashed',
                   shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  statEmoji:     { fontSize:20, marginBottom:4 },
  statNum:       { fontSize:22, fontFamily:'Patrick Hand' },
  statUnit:      { fontSize:13, fontFamily:'Nunito', color:'#9CA3AF', marginTop:1 },
  statLabel:     { fontSize:13, fontFamily:'Nunito', color:'#9CA3AF', marginTop:4 },

  formCard:      { backgroundColor:'#FFFFFF', borderRadius:24, padding:20, marginBottom:14,
                   borderWidth:2, borderColor:'#E5E7EB', borderStyle:'dashed',
                   shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  formTitle:     { fontSize:20, fontFamily:'Patrick Hand', color:'#1E1E1E', marginBottom:16 },
  inputRow:      { flexDirection:'row', gap:12, marginBottom:14 },
  inputGroup:    { flex:1 },
  inputLabel:    { fontSize:16, fontFamily:'Nunito', color:'#6B7280', fontWeight:'600', marginBottom:6 },
  inputWrap:     { flexDirection:'row', alignItems:'center', backgroundColor:'#FFFFF0',
                   borderRadius:16, borderWidth:2, borderColor:'#E5E7EB', paddingHorizontal:12 },
  input:         { flex:1, fontSize:24, fontFamily:'Patrick Hand', color:'#1E1E1E', paddingVertical:10 },
  inputUnit:     { fontSize:14, fontFamily:'Nunito', color:'#9CA3AF', fontWeight:'600' },
  noteWrap:      { backgroundColor:'#FFFFF0', borderRadius:16, borderWidth:2,
                   borderColor:'#E5E7EB', paddingHorizontal:12, marginBottom:16 },
  noteInput:     { fontSize:16, fontFamily:'Nunito', color:'#1E1E1E', paddingVertical:10, minHeight:44 },
  saveBtn:       { backgroundColor:'#60A5FA', borderRadius:16, paddingVertical:15, alignItems:'center',
                   shadowColor:'#60A5FA', shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:10, elevation:4 },
  saveBtnText:   { fontSize:18, fontFamily:'Nunito', fontWeight:'700', color:'#fff' },

  historyCard:   { backgroundColor:'#FFFFFF', borderRadius:24, padding:20,
                   borderWidth:2, borderColor:'#E5E7EB', borderStyle:'dashed',
                   shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  histRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12 },
  histDivider:   { borderBottomWidth:1, borderBottomColor:'#F3F4F6', borderStyle:'dashed' },
  histDate:      { fontSize:16, fontFamily:'Nunito', fontWeight:'600', color:'#1E1E1E' },
  histNote:      { fontSize:14, fontFamily:'Nunito', color:'#9CA3AF', marginTop:2 },
  histRight:     { alignItems:'flex-end', gap:4 },
  histWeight:    { fontSize:18, fontFamily:'Patrick Hand', color:'#1E1E1E' },
  histBmiPill:   { borderRadius:9999, paddingHorizontal:10, paddingVertical:3 },
  histBmiText:   { fontSize:13, fontFamily:'Nunito', fontWeight:'700' },
});

export default BodyMetricsScreen;
