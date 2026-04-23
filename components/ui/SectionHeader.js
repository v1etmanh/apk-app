import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../theme';

export default function SectionHeader({ title, subtitle, rightElement, style, titleStyle }) {
  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightElement && (
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Nunito_700Bold', 
    fontSize: 17, 
    color: C.text || '#3E2723',
  },
  subtitle: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 14,
    color: C.textMid || '#5D4037',
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: 12,
  }
});
