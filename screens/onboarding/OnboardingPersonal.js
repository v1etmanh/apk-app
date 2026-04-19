import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveProfile } from '../../utils/database';
import { useAppStore } from '../../store/useAppStore';

/* ─── DoodlePad Design Tokens ─── */
const DP = {
  primary:      '#60A5FA',
  primaryLight: '#EFF6FF',
  primaryDark:  '#3B82F6',
  secondary:    '#4ADE80',
  tertiary:     '#FBBF24',
  bg:           '#FFFFF0',
  surface:      '#FFFFFF',
  border:       '#E5E7EB',
  borderMid:    '#A1A1AA',
  text:         '#1F2937',
  textMid:      '#6B7280',
  textLight:    '#9CA3AF',
};

/* ─── Progress Dots ─── */
const ProgressDots = ({ current, total }) => (
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={{
        width: i === current ? 22 : 8, height: 8, borderRadius: 4,
        backgroundColor: i === current ? DP.primary : DP.border,
      }} />
    ))}
  </View>
);

/* ─── Chip Group ─── */
const ChipGroup = ({ label, options, value, onChange, multi = false }) => (
  <View style={s.fieldBlock}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={s.chips}>
      {options.map(({ key, icon, text }) => {
        const active = multi ? value?.includes(key) : value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[s.chip, active && s.chipActive]}
            onPress={() => {
              if (multi) {
                const next = value?.includes(key)
                  ? value.filter(v => v !== key)
                  : [...(value || []), key];
                onChange(next);
              } else onChange(key);
            }}
            activeOpacity={0.75}
          >
            {icon ? <Text style={s.chipIcon}>{icon}</Text> : null}
            <Text style={[s.chipText, active && s.chipTextActive]}>{text}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const GENDER_OPTS   = [{ key:'male',icon:'👨',text:'Nam' },{ key:'female',icon:'👩',text:'Nữ' },{ key:'other',icon:'🧑',text:'Khác' }];
const DIET_OPTS     = [{ key:'omnivore',icon:'🍗',text:'Ăn tất cả' },{ key:'vegetarian',icon:'🥬',text:'Chay' },{ key:'vegan',icon:'🌱',text:'Thuần chay' },{ key:'pescatarian',icon:'🐟',text:'Ăn cá' }];
const GOAL_OPTS     = [{ key:'maintenance',icon:'⚖️',text:'Duy trì' },{ key:'weight_loss',icon:'📉',text:'Giảm cân' },{ key:'muscle_gain',icon:'💪',text:'Tăng cơ' },{ key:'detox',icon:'🌿',text:'Detox' }];
const ACTIVITY_OPTS = [{ key:'sedentary',text:'Ít vận động' },{ key:'lightly_active',text:'Nhẹ nhàng' },{ key:'moderately_active',text:'Vừa phải' },{ key:'very_active',text:'Nhiều' }];

const OnboardingPersonal = ({ navigation }) => {
  const [age, setAge]           = useState('25');
  const [gender, setGender]     = useState('female');
  const [dietType, setDietType] = useState('omnivore');
  const [goal, setGoal]         = useState('maintenance');
  const [activity, setActivity] = useState('moderately_active');
  const [saving, setSaving]     = useState(false);
  const { setProfile }          = useAppStore();

  const handleSave = async () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      Alert.alert('Oops! 😅', 'Vui lòng nhập tuổi hợp lệ từ 10 đến 100 nhé!'); return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profileData = {
        age: ageNum, gender,
        diet_type: dietType, dietary_goal: goal,
        activity_level: activity, updated_at: now,
      };
      await saveProfile(profileData);
      setProfile({ id: 1, ...profileData, created_at: now });
      navigation.navigate('OnboardingAllergy');
    } catch (e) {
      Alert.alert('Oops! 😅', 'Không thể lưu thông tin. Thử lại nhé!');
    } finally { setSaving(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DP.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <ProgressDots current={1} total={3} />
        <View style={s.stepBadge}>
          <Text style={s.stepText}>Bước 2 / 3</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Text style={s.title}>Về bạn 👤</Text>
        <Text style={s.sub}>Để gợi ý phù hợp với nhu cầu dinh dưỡng của bạn</Text>

        {/* Age stepper */}
        <View style={s.fieldBlock}>
          <Text style={s.fieldLabel}>Tuổi của bạn</Text>
          <View style={s.ageRow}>
            <TouchableOpacity
              style={s.ageBtn}
              onPress={() => setAge(a => String(Math.max(10, parseInt(a || 25) - 1)))}
            >
              <Text style={s.ageBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.ageInputWrap}>
              <TextInput
                style={s.ageInput}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                maxLength={3}
                textAlign="center"
              />
              <Text style={s.ageUnit}>tuổi</Text>
            </View>
            <TouchableOpacity
              style={s.ageBtn}
              onPress={() => setAge(a => String(Math.min(100, parseInt(a || 25) + 1)))}
            >
              <Text style={s.ageBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ChipGroup label="Giới tính"    options={GENDER_OPTS}   value={gender}   onChange={setGender} />
        <ChipGroup label="Chế độ ăn"   options={DIET_OPTS}     value={dietType} onChange={setDietType} />
        <ChipGroup label="Mục tiêu"     options={GOAL_OPTS}     value={goal}     onChange={setGoal} />
        <ChipGroup label="Mức vận động" options={ACTIVITY_OPTS} value={activity} onChange={setActivity} />

        <TouchableOpacity
          style={[s.btn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>{saving ? 'Đang lưu... ⏳' : 'Tiếp tục →'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DP.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: DP.bg,
  },
  stepBadge: {
    backgroundColor: DP.primaryLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DP.primary,
  },
  stepText:  { fontSize: 13, color: DP.primary, fontWeight: '700' },
  scroll:    { paddingHorizontal: 24, paddingTop: 4 },
  title:     { fontSize: 30, fontWeight: '800', color: DP.text, marginBottom: 6 },
  sub:       { fontSize: 16, color: DP.textMid, lineHeight: 24, marginBottom: 28 },

  /* Field */
  fieldBlock: { marginBottom: 26 },
  fieldLabel: { fontSize: 16, fontWeight: '700', color: DP.text, marginBottom: 12 },

  /* Chips */
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DP.surface,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: DP.border,
    elevation: 1,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  chipActive:     { backgroundColor: DP.primaryLight, borderColor: DP.primary, borderStyle: 'solid' },
  chipIcon:       { fontSize: 15 },
  chipText:       { fontSize: 15, color: DP.textMid, fontWeight: '500' },
  chipTextActive: { color: DP.primaryDark, fontWeight: '700' },

  /* Age stepper */
  ageRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ageBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: DP.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DP.primary,
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  ageBtnText: { fontSize: 24, color: DP.primary, fontWeight: '600', lineHeight: 28 },
  ageInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ageInput: {
    width: 76,
    height: 54,
    backgroundColor: DP.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: DP.primary,
    fontSize: 28,
    fontWeight: '800',
    color: DP.text,
  },
  ageUnit: { fontSize: 16, color: DP.textLight, fontWeight: '500' },

  /* CTA */
  btn: {
    backgroundColor: DP.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: DP.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  btnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});

export default OnboardingPersonal;
