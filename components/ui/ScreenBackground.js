import React from 'react';
import { View, StyleSheet, ImageBackground, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../theme';

// Ensure you have these textures in your assets or map them properly
const ASSETS = {
  sky: require('../../assets/textures/sky_watercolor.png'),
  paper: require('../../assets/textures/paper_cream.png'),
};

export default function ScreenBackground({ 
  children, 
  style, 
  overlayStyle,
  edges = ['top'],
  useTexture = true,
  texture = 'sky',
  statusBarStyle = "dark-content",
}) {
  const insets = useSafeAreaInsets();
  
  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  const innerContent = (
    <>
      <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
      <View style={[StyleSheet.absoluteFillObject, styles.overlay, overlayStyle]} />
      <View style={[styles.container, { paddingTop, paddingBottom, paddingLeft, paddingRight }, style]}>
        {children}
      </View>
    </>
  );

  if (useTexture && ASSETS[texture]) {
    return (
      <ImageBackground source={ASSETS[texture]} style={styles.background} resizeMode="cover">
        {innerContent}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.background, { backgroundColor: C.bg }]}>
      {innerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  container: {
    flex: 1,
  },
});
