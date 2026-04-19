import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert,
} from 'react-native';
import { loadProfile as loadProfileDB, saveProfile as saveProfileDB } from '../utils/database';
import { useAppStore } from '../store/useAppStore';

const GENDER_OPTS   = [{ key:'male',icon:'👨',text:'Nam' },{ key:'female',icon:'👩',text:'Nữ' },{ key:'other',icon:'🧑',text:'Khác' }];
const DIET_OPTS     = [{ key:'omnivore',icon:'🍗',text:'Ăn tất cả' },{ key:'vegetarian',icon:'🥬',text:'Chay' },{ key:'vegan',icon:'🌱',text:'Thuần chay' },{ key:'pescatarian',icon:'🐟',text:'Ăn cá' }];
const GOAL_OPTS     = [{ key:'maintenance',icon:'⚖️',text:'Duy trì' },{ key:'weight_loss',icon:'📉',text:'Giảm cân' },{ key:'muscle_gain',icon:'💪',text:'Tăng cơ' },{ key:'detox',icon:'🌿',text:'Detox' }];
const ACTIVITY_OPTS = [{ key:'sedentary',text:'Ít vận động' },{ key:'lightly_active',text:'Nhẹ nhàng' },{ key:'moderately_active',text:'Vừa phải' },{ key:'very_active',text:'Nhiều' }];

// ─── Chip group component ─────────────────────────────────────────────────────
const ChipGroup = ({ label, options, value, onChange }) => (
  <View style={st.block}>
    <Text style={st.blockLabel}>{label}</Text>
    <View style={st.chips}>
      {options.map(({ key, icon, text }) => {
        const active = value === key;
        return (
          <TouchableOpacity key={key}
            style={[st.chip, active && st.chipActive]}
            onPress={() => onChange(key)} activeOpacity={0.75}>
            {icon ? <Text style={{ fontSize: 16 }}>{icon}</Text> : null}
            <Text style={[st.chipText, active && st.chipTextActive]}>{text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const EditPersonalScreen = ({ navigation }) => {
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState('female');
  const [dietType, setDietType] = useState('omnivore');
  const [goal, setGoal]         = useState('maintenance');
  const [activity, setActivity] = useState('moderately_active');
  const [saving, setSaving]     = useState(false);
  const { profile, setProfile } = useAppStore();

  useEffect(() => {
    const p = profile;
    if (p) {
      setAge(String(p.age || ''));
      setGender(p.gender || 'female');
      setDietType(p.diet_type || 'omnivore');
      setGoal(p.dietary_goal || 'maintenance');
      setActivity(p.activity_level || 'moderately_active');
    } else {
      loadProfileDB().then(r => {
        if (r) {
          setAge(String(r.age || ''));
          setGender(r.gender || 'female');
          setDietType(r.diet_type || 'omnivore');
          setGoal(r.dietary_goal || 'maintenance');
          setActivity(r.activity_level || 'moderately_active');
          setProfile(r);
        }
      }).catch(console.error);
    }
  }, []);

  const handleSave = async () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      Alert.alert('Ối!', 'Tuổi phải từ 10 đến 100 nhé 😊'); return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data = { age: ageNum, gender, diet_type: dietType, dietary_goal: goal, activity_level: activity, updated_at: now };
      await saveProfileDB(data);
      setProfile({ id: 1, ...data, created_at: now });
      Alert.alert('Đã lưu ✓', 'Thông tin cá nhân đã được cập nhật.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Ối!', 'Không thể lưu. Thử lại nhé 🙏');
    } finally { setSaving(false); }
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Nav */}
      <View style={st.nav}>
        <TouchableOpacity style={st.back} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={st.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={st.navTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">

        {/* Age stepper */}
        <View style={st.block}>
          <Text style={st.blockLabel}>Tuổi 🎂</Text>
          <View style={st.ageRow}>
            <TouchableOpacity style={st.stepper}
              onPress={() => setAge(a => String(Math.max(10, parseInt(a||25)-1)))}>
              <Text style={st.stepIcon}>−</Text>
            </TouchableOpacity>
            <TextInput style={st.ageInput} value={age} onChangeText={setAge}
              keyboardType="numeric" maxLength={3} textAlign="center" />
            <Text style={st.ageUnit}>tuổi</Text>
            <TouchableOpacity style={st.stepper}
              onPress={() => setAge(a => String(Math.min(100, parseInt(a||25)+1)))}>
              <Text style={st.stepIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ChipGroup label="Giới tính 🧑"      options={GENDER_OPTS}   value={gender}   onChange={setGender} />
        <ChipGroup label="Chế độ ăn 🥗"      options={DIET_OPTS}     value={dietType} onChange={setDietType} />
        <ChipGroup label="Mục tiêu 🎯"        options={GOAL_OPTS}     value={goal}     onChange={setGoal} />
        <ChipGroup label="Mức vận động 🏃"    options={ACTIVITY_OPTS} value={activity} onChange={setActivity} />

        <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={st.saveBtnText}>{saving ? 'Đang lưu...' : '✓ Lưu thông tin'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#FFFFF0' },
  nav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
                   borderBottomWidth: 2, borderBottomColor: '#E5E7EB', borderStyle: 'dashed' },
  back:          { width: 40, height: 40, justifyContent: 'center' },
  backArrow:     { fontSize: 28, color: '#60A5FA', fontWeight: '300', lineHeight: 34 },
  navTitle:      { fontSize: 20, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  scroll:        { padding: 20 },
  block:         { marginBottom: 24 },
  blockLabel:    { fontSize: 18, fontFamily: 'Nunito', fontWeight: '700', color: '#1E1E1E', marginBottom: 12 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6,
                   backgroundColor: '#FFFFFF', borderRadius: 9999,
                   paddingHorizontal: 16, paddingVertical: 10,
                   borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  chipActive:    { backgroundColor: '#EFF6FF', borderColor: '#60A5FA', borderStyle: 'solid' },
  chipText:      { fontSize: 16, color: '#6B7280', fontFamily: 'Nunito', fontWeight: '500' },
  chipTextActive:{ color: '#3B82F6', fontWeight: '700' },
  ageRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF',
                   justifyContent: 'center', alignItems: 'center',
                   borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  stepIcon:      { fontSize: 24, color: '#60A5FA', fontWeight: '600', lineHeight: 28 },
  ageInput:      { width: 80, height: 56, backgroundColor: '#FFFFFF', borderRadius: 16,
                   borderWidth: 2, borderColor: '#60A5FA',
                   fontSize: 28, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  ageUnit:       { fontSize: 16, color: '#9CA3AF', fontFamily: 'Nunito' },
  saveBtn:       { backgroundColor: '#60A5FA', borderRadius: 16, paddingVertical: 17,
                   alignItems: 'center', marginTop: 8,
                   shadowColor: '#60A5FA', shadowOffset: { width: 0, height: 3 },
                   shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText:   { fontSize: 20, fontFamily: 'Patrick Hand', color: '#FFFFFF', letterSpacing: 0.5 },
});

export default EditPersonalScreen;
