import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getProfileAge } from '../utils/profileIdentity';

export default function BirthYearField({ value, onChange, showError = false }) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const year = new Date().getFullYear();
  const invalid = getProfileAge({ birth_year: value }, year) === null;
  const error = invalid && (touched || showError);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{t('familyAvatar.birthYear')}</Text>
      <TextInput accessibilityLabel={t('familyAvatar.birthYear')} value={String(value ?? '')}
        onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))} onBlur={() => setTouched(true)}
        keyboardType="number-pad" maxLength={4} placeholder={t('profileEdit.yearPlaceholder')}
        style={[s.input, error && { borderColor: '#A5372A' }]} />
      {error && <Text accessibilityLiveRegion="polite" style={s.error}>{t('familyAvatar.invalidYear', { min: year - 120, max: year })}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginVertical: 12 },
  label: { color: '#513222', fontFamily: 'BeVietnamPro-Bold', marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#C8A96E', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#FFFAF0', color: '#513222', fontSize: 16 },
  error: { color: '#A5372A', marginTop: 6, fontSize: 12 },
});
