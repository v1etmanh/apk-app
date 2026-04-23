import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ImageBackground } from 'react-native';
import { C, shadow } from '../../theme';

const ASSETS = {
  wood: require('../../assets/textures/wood_light.png'),
};

export default function WoodButton({ 
  onPress, 
  title, 
  icon,
  style, 
  textStyle, 
  disabled = false,
  accessibilityLabel 
}) {
  return (
    <TouchableOpacity
      style={[
        styles.buttonWrapper, 
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      <ImageBackground
        source={ASSETS.wood}
        style={styles.buttonInner}
        imageStyle={{ borderRadius: 22, opacity: disabled ? 0.35 : 0.8 }}
        resizeMode="cover"
      >
        <View style={[styles.content, disabled && { backgroundColor: 'rgba(92,58,30,0.3)' }]}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(160,120,74,0.5)',
    ...shadow(3),
    minHeight: 44, // 44px min touch target compliant
  },
  disabled: {
    opacity: 0.8,
    ...shadow(1),
  },
  buttonInner: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(92,58,30,0.72)', // Tinting to match the theme's brown overlay
    gap: 8,
  },
  iconWrapper: {
    marginRight: 4,
  },
  text: {
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.3,
  },
});
