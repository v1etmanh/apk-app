import React, { useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { C, F, R, shadow } from '../theme';
import PaperCard from './ui/PaperCard';

// 1. Quy hoạch Lottie sources
const LOTTIE = {
  lunch:    require('../assets/animations/cat_orange.json'),
  dinner:   require('../assets/animations/Lazy cat.json'),
  fallback: require('../assets/animations/Cat Pookie.json'),
  no_dish:  require('../assets/animations/cat_gosh.json'),
};

// 2. Component con để tái sử dụng
function NutritionChip({ emoji, label, color }) {
  return (
    <View style={[styles.chip, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function MealReminderModal({
  visible,
  onClose,
  onNavigate,
  dishName  = 'Món ăn hôm nay',
  mealLabel = 'Bữa trưa',
  mealId    = 'lunch',
  nutrition = null,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Reset và chạy animation khi modal hiện lên
      lottieRef.current?.reset();
      lottieRef.current?.play();
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const catSource = nutrition ? (LOTTIE[mealId] ?? LOTTIE.fallback) : LOTTIE.no_dish;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <PaperCard priority="primary">
            
            <LottieView
              ref={lottieRef}
              source={catSource}
              style={styles.lottie}
              loop
            />

            <Text style={styles.heading}>Đến giờ {mealLabel} rồi! 🍽️</Text>
            <Text style={styles.dishName}>{dishName}</Text>

            {nutrition ? (
              <View style={styles.chips}>
                <NutritionChip emoji="🔥" label={`${nutrition.calories} kcal`} color="#E8512A" />
                <NutritionChip emoji="🥩" label={`${nutrition.protein}g đạm`}  color="#2A8AE8" />
                <NutritionChip emoji="🍞" label={`${nutrition.carbs}g tinh bột`} color="#C97A1A" />
              </View>
            ) : (
              <Text style={styles.subtext}>🐱 Mèo đầu bếp đã chọn cho bạn!</Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={onNavigate}>
                <Text style={styles.btnPrimaryText}>Xem gợi ý</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
                <Text style={styles.btnSecondaryText}>Để sau</Text>
              </TouchableOpacity>
            </View>

          </PaperCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

// 3. Một khối Styles duy nhất
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 15, 5, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  lottie: {
    width: 130,
    height: 130,
    alignSelf: 'center',
    marginBottom: 4,
  },
  heading: {
    fontSize: F.xl,
    fontWeight: '700',
    color: C.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  dishName: {
    fontSize: F.lg,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: F.base },
  chipLabel: { fontSize: F.sm, fontWeight: '600' },
  subtext: {
    fontSize: F.base,
    color: C.textLight,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: R.lg,
    paddingVertical: 12,
    alignItems: 'center',
    ...shadow(2),
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: F.base,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    borderRadius: R.lg,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  btnSecondaryText: {
    color: C.textMid,
    fontSize: F.base,
    fontWeight: '600',
  },
});