import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ImageBackground, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { C } from '../../theme';

const { width } = Dimensions.get('window');

const TIPS = [
  "Đang dọn dẹp nhà bếp...",
  "Đang chuẩn bị nguyên liệu...",
  "Đang thắp sáng lò nướng...",
  "Đang viết menu hôm nay...",
  "Đang tìm công thức mới..."
];

const LoadingScreen = ({ isReady, onFinish }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Tip cycling logic
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTipIndex(prev => (prev + 1) % TIPS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Exit transition logic
  useEffect(() => {
    if (isReady) {
      Animated.parallel([
        Animated.timing(exitAnim, {
          toValue: 0,
          duration: 700, // Slightly longer for elegance
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05, // Subtle scale
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30, // Lifting effect
          duration: 700,
          useNativeDriver: true,
        })
      ]).start(() => {
        if (onFinish) onFinish();
      });
    }
  }, [isReady]);

  return (
    <Animated.View style={[
      st.container, 
      { 
        opacity: exitAnim, 
        transform: [
          { scale: scaleAnim },
          { translateY: translateY }
        ] 
      }
    ]}>
      <ImageBackground
        source={require('../../assets/textures/paper_cream.png')}
        style={st.root}
        resizeMode="cover"
      >
        <View style={st.centered}>
          <LottieView
            source={require('../../assets/animations/cat_orange.json')}
            autoPlay
            loop
            style={st.lottie}
          />
          
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={st.loadingText}>{TIPS[tipIndex]}</Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
};

const st = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    // Fixed medium-small size to prevent scaling issues across devices
    width: 100, 
    height: 100,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16, 
    color: C.text, // Darker text for visibility
    fontWeight: '700', // Bolder
    letterSpacing: 0.5,
  }
});

export default LoadingScreen;
