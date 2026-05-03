/**
 * AddEditProfileScreen.js
 * Tạo mới hoặc chỉnh sửa 1 profile thành viên
 * Route params: { profileId? } — có profileId → edit mode, không có → create mode
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import {
  saveProfileMember, loadProfileById,
  deleteProfileMember, getActiveProfileId, setActiveProfileId,
} from '../utils/database';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';

const ASSETS = { paper: require('../assets/textures/paper_cream.png') };

// ── Options ───────────────────────────────────────────────────────────────────
const AVATARS = ['🧑','👦','👧','👴','👵','👨','👩','🧒','👤'];
const RELATIONS = [
  { key: 'self',    label: 'Bản thân' },
  { key: 'child',   label: 'Con' },
  { key: 'parent',  label: 'Cha / Mẹ' },
  { key: 'spouse',  label: 'Vợ / Chồng' },
  { key: 'sibling', label: 'Anh / Chị / Em' },
  { key: 'other',   label: 'Khác' },
];
const GENDERS   = [{ key: 'male', label: '♂ Nam' }, { key: 'female', label: '♀ Nữ' }];
const GOALS     = [
  { key: 'maintenance', label: '⚖️ Duy trì' },
  { key: 'loss',        label: '🔻 Giảm cân' },
  { key: 'gain',        label: '🔺 Tăng cân' },
];
const DIETS     = [
  { key: 'omnivore',    label: '🍖 Ăn tất cả' },
  { key: 'vegetarian',  label: '🥗 Chay' },
  { key: 'vegan',       label: '🌱 Thuần chay' },
  { key: 'pescatarian', label: '🐟 Ăn cá' },
];
const ACTIVITIES = [
  { key: 'sedentary',          label: '🛋 Ít vận động' },
  { key: 'lightly_active',     label: '🚶 Nhẹ nhàng' },
  { key: 'moderately_active',  label: '🏃 Vừa phải' },
  { key: 'very_active',        label: '⚡ Nhiều vận động' },
];

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionLabel = ({ text }) => (
  <Text style={st.sectionLabel}>{text}</Text>
);

const ChipGroup = ({ options, value, onChange }) => (
  <View style={st.chipRow}>
    {options.map(o => {
      const active = value === o.key;
      return (
        <TouchableOpacity
          key={o.key}
          style={[st.chip, active && st.chipActive]}
          activeOpacity={0.75}
          onPress={() => onChange(o.key)}
        >
          <Text style={[st.chipText, active && st.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const AddEditProfileScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { loadAllProfilesAction, switchProfile, profiles, activeProfileId } = useAppStore();

  const editProfileId = route?.params?.profileId || null;
  const isEdit = Boolean(editProfileId);

  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(isEdit);
  const [displayName, setDisplayName] = useState('');
  const [relation,    setRelation]    = useState('self');
  const [avatar,      setAvatar]      = useState('🧑');
  const [gender,      setGender]      = useState('male');
  const [birthYear,   setBirthYear]   = useState('');
  const [goal,        setGoal]        = useState('maintenance');
  const [diet,        setDiet]        = useState('omnivore');
  const [activity,    setActivity]    = useState('moderately_active');

  // Load existing data if edit mode
  useEffect(() => {
    if (!isEdit) return;
    loadProfileById(editProfileId).then(p => {
      if (p) {
        setDisplayName(p.displayName || '');
        setRelation(p.relation || 'self');
        setAvatar(p.avatar || '🧑');
        setGender(p.gender || 'male');
        setBirthYear(p.birth_year ? String(p.birth_year) : '');
        setGoal(p.dietary_goal || 'maintenance');
        setDiet(p.diet_type || 'omnivore');
        setActivity(p.activity_level || 'moderately_active');
      }
      setLoading(false);
    });
  }, [editProfileId]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thành viên.');
      return;
    }
    setSaving(true);
    try {
      const profileId = editProfileId || ('profile_' + Date.now().toString(36));
      const year = birthYear ? parseInt(birthYear, 10) : null;
      await saveProfileMember({
        profileId,
        displayName:    trimmed,
        relation,
        avatar,
        gender,
        birth_year:     year || null,
        age:            year ? (new Date().getFullYear() - year) : null,
        dietary_goal:   goal,
        diet_type:      diet,
        activity_level: activity,
        created_at:     isEdit ? undefined : new Date().toISOString(),
      });
      await loadAllProfilesAction();
      // Nếu tạo mới → switch sang profile vừa tạo
      if (!isEdit) await switchProfile(profileId);
      navigation.goBack();
    } catch (e) {
      console.error('handleSave:', e);
      Alert.alert('Lỗi', 'Không thể lưu thông tin. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (profiles.length <= 1) {
      Alert.alert('Không thể xóa', 'Bạn cần ít nhất 1 thành viên.');
      return;
    }
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc muốn xóa "${displayName}"? Dữ liệu sẽ mất vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteProfileMember(editProfileId);
              // Nếu đang xóa profile đang active → switch sang profile đầu tiên còn lại
              if (editProfileId === activeProfileId) {
                const remaining = profiles.filter(p => p.profileId !== editProfileId);
                if (remaining.length > 0) await switchProfile(remaining[0].profileId);
              }
              await loadAllProfilesAction();
              navigation.goBack();
            } catch (e) {
              console.error('handleDelete:', e);
              Alert.alert('Lỗi', 'Không thể xóa. Thử lại sau.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenBackground texture="paper" edges={[]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground texture="paper" edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* ── Header ── */}
        <View style={st.headerRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={st.backBtnText}>‹ Trở về</Text>
          </TouchableOpacity>
          <Text style={st.screenTitle}>{isEdit ? 'Chỉnh sửa' : 'Thêm thành viên'}</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* ── Avatar picker ── */}
        <View style={st.card}>
          <Image source={ASSETS.paper} style={[StyleSheet.absoluteFill, { borderRadius: 18, opacity: 0.5 }]} resizeMode="cover" />
          <SectionLabel text="Chọn avatar" />
          <View style={st.avatarGrid}>
            {AVATARS.map(a => (
              <TouchableOpacity
                key={a}
                style={[st.avatarItem, avatar === a && st.avatarItemActive]}
                onPress={() => setAvatar(a)}
                activeOpacity={0.75}
              >
                <Text style={st.avatarEmoji}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tên + Quan hệ ── */}
        <View style={st.card}>
          <Image source={ASSETS.paper} style={[StyleSheet.absoluteFill, { borderRadius: 18, opacity: 0.5 }]} resizeMode="cover" />
          <SectionLabel text="Tên thành viên *" />
          <TextInput
            style={st.input}
            placeholder="Ví dụ: Bản thân, Bé Khánh..."
            placeholderTextColor={C.textLight}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
          />

          <SectionLabel text="Quan hệ" />
          <ChipGroup options={RELATIONS} value={relation} onChange={setRelation} />

          <SectionLabel text="Giới tính" />
          <ChipGroup options={GENDERS} value={gender} onChange={setGender} />

          <SectionLabel text="Năm sinh (tuỳ chọn)" />
          <TextInput
            style={st.input}
            placeholder="Ví dụ: 1995"
            placeholderTextColor={C.textLight}
            value={birthYear}
            onChangeText={v => setBirthYear(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* ── Ăn uống & vận động ── */}
        <View style={st.card}>
          <Image source={ASSETS.paper} style={[StyleSheet.absoluteFill, { borderRadius: 18, opacity: 0.5 }]} resizeMode="cover" />
          <SectionLabel text="Mục tiêu ăn uống" />
          <ChipGroup options={GOALS} value={goal} onChange={setGoal} />

          <SectionLabel text="Chế độ ăn" />
          <ChipGroup options={DIETS} value={diet} onChange={setDiet} />

          <SectionLabel text="Mức độ vận động" />
          <ChipGroup options={ACTIVITIES} value={activity} onChange={setActivity} />
        </View>

        {/* ── Buttons ── */}
        <TouchableOpacity
          style={[st.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.82}
        >
          {saving
            ? <ActivityIndicator color="#FFF8EA" />
            : <Text style={st.saveBtnText}>{isEdit ? '💾 Lưu thay đổi' : '✅ Thêm thành viên'}</Text>
          }
        </TouchableOpacity>

        {isEdit && profiles.length > 1 && (
          <TouchableOpacity
            style={[st.deleteBtn, saving && { opacity: 0.4 }]}
            onPress={handleDelete}
            disabled={saving}
            activeOpacity={0.75}
          >
            <Text style={st.deleteBtnText}>🗑 Xóa thành viên này</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};

const st = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backBtnText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 16, color: C.primary },
  screenTitle: { fontFamily: 'Lora-Bold', fontSize: 18, color: C.text, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: 'rgba(255,252,240,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.3)',
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Section label
  sectionLabel: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 13,
    color: C.primary,
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Avatar grid
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,110,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarItemActive: { borderColor: C.primary, borderWidth: 2, backgroundColor: 'rgba(200,169,110,0.15)' },
  avatarEmoji: { fontSize: 26 },

  // Input
  input: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: C.text,
    marginBottom: 16,
  },

  // Chip group
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.35)',
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText:   { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: C.textMid },
  chipTextActive: { color: '#FFF8EA' },

  // Save button
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 16, color: '#FFF8EA' },

  // Delete button
  deleteBtn: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.accentRed,
    backgroundColor: 'rgba(231,76,60,0.05)',
  },
  deleteBtnText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 15, color: C.accentRed },
});

export default AddEditProfileScreen;
