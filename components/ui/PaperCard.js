import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { C, shadow } from '../../theme';

const ASSETS = {
  paper: require('../../assets/textures/paper_cream.png'),
};

export default function PaperCard({ 
  children, 
  style, 
  innerStyle,
  borderColor = C.border,
  priority = 'secondary', // 'primary' brings out the wobbly/stronger traits
}) {
  const isPrimary = priority === 'primary';
  
  return (
    <ImageBackground
      source={ASSETS.paper}
      style={[
        styles.paperCard,
        isPrimary && styles.primaryCard,
        { borderColor },
        style
      ]}
      imageStyle={[styles.paperCardImg, isPrimary && styles.primaryCardImg]}
      resizeMode="cover"
    >
      <View style={[styles.paperCardInner, innerStyle]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  paperCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadow(2), // Standard drop shadow
  },
  primaryCard: {
    borderWidth: 1.5,
    ...shadow(4), // Extenuated shadow for primary widgets
  },
  paperCardImg: { 
    borderRadius: 18, 
    opacity: 0.88 
  },
  primaryCardImg: {
    opacity: 0.95,
  },
  paperCardInner: { 
    backgroundColor: 'rgba(255,255,255,0.22)', 
    padding: 14 
  },
});
