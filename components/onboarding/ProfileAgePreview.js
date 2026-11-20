import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ProfileAvatar from '../ui/ProfileAvatar';
import { getProfileAge, getProfileAgeGroup, resolveProfileAvatar, PROFILE_AGE_GROUPS } from '../../utils/profileIdentity';
import { C, F, R } from '../../theme';

export default function ProfileAgePreview({ profile, year }) {
  const { t } = useTranslation();
  const age = getProfileAge(profile, year);
  const group = getProfileAgeGroup(profile, year);
  const { key } = resolveProfileAvatar(profile, year);
  return (
    <View style={s.card}>
      <View style={s.preview}>
        <ProfileAvatar profile={profile} size={104} animated />
        <View style={s.description} accessibilityLiveRegion="polite">
          <Text style={s.title}>{key ? t(`familyAvatar.characters.${key}`) : t('familyAvatar.previewTitle')}</Text>
          <Text style={s.caption}>
            {age !== null ? t('familyAvatar.ageThisYear', { count: age }) : t('familyAvatar.missingYear')}
          </Text>
          <Text style={s.caption}>{t('familyAvatar.auto')}</Text>
        </View>
      </View>
      <Text style={s.groupLabel}>{t('familyAvatar.ageGroupsTitle')}</Text>
      <View style={s.groups}>
        {PROFILE_AGE_GROUPS.map(item => {
          const active = group?.key === item.key;
          const label = t(`familyAvatar.ageGroups.${item.key}`);
          return (
            <View key={item.key} style={[s.chip, active && s.activeChip]} accessible
              accessibilityLabel={active ? `${label}, ${t('common.selected')}` : label}>
              <Text style={[s.chipText, active && s.activeText]}>{active ? '✓ ' : ''}{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.hint}>{t('familyAvatar.ageGroupsHint')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 12, borderRadius: R.lg, borderWidth: 1, borderColor: C.paperStroke, backgroundColor: C.parchmentLight, marginBottom: 20 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  description: { flex: 1 },
  title: { fontSize: F.lg, color: C.text, fontFamily: 'BeVietnamPro-Bold', marginBottom: 4 },
  caption: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 19 },
  groupLabel: { fontSize: F.sm, color: C.text, fontFamily: 'BeVietnamPro-SemiBold', marginVertical: 8 },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.chipBg },
  activeChip: { backgroundColor: C.freshBg, borderColor: C.freshText },
  chipText: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular' },
  activeText: { color: C.freshText, fontFamily: 'BeVietnamPro-Bold' },
  hint: { fontSize: 12, color: C.textSoft, fontFamily: 'BeVietnamPro-Regular', lineHeight: 18, marginTop: 8 },
});
