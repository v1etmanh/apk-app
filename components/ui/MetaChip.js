import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../theme';

export default function MetaChip({ 
  label, 
  icon, 
  variant = 'default',
  style, 
  textStyle 
}) {
  const isOutline = variant === 'outline';
  const isAccent = variant === 'accent';

  return (
    <View style={[
      styles.chip,
      isOutline && styles.chipOutline,
      isAccent && styles.chipAccent,
      style
    ]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={[
        styles.text,
        isAccent && styles.textAccent,
        textStyle
      ]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(92,58,30,0.12)', // Default brownSoft
    borderWidth: 0.5, 
    borderColor: 'rgba(92,58,30,0.18)',
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipOutline: {
    backgroundColor: 'transparent',
    borderColor: C.border,
  },
  chipAccent: {
    backgroundColor: 'rgba(56, 176, 122, 0.15)', // Green soft
    borderColor: 'rgba(56, 176, 122, 0.3)',
  },
  text: {
    fontFamily: 'Nunito_600SemiBold', 
    fontSize: 11, 
    color: C.textSecondary || '#7A5A3A',
  },
  textAccent: {
    color: C.accentGreen,
    fontFamily: 'Nunito_700Bold',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
