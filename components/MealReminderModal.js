import React, { useRef, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { C, F, R, shadow } from '../theme';
import PaperCard from './ui/PaperCard';

// ── Lottie sources ────────────────────────────────────────────────────────────
const LOTTIE = {
  lunch:    require('../assets/animations/cat_orange.json'),
  dinner:   require('../assets/animations/Lazy cat.json'),
  fallback: require('../assets/animations/Cat Pookie.json'),
  no_dish:  require('../assets/animations/cat_gosh.json'),
};

// ── Copy văn chương ───────────────────────────────────────────────────────────
const MODAL_COPY = {
  lunch: {
    headings: [
      (name) => `Trưa nay ăn ${name} đi nào! 🍚`,
      (name) => `${name} đang chờ bạn nè~ 🥢`,
      (name) => `Bụng réo chưa? Có ${name} rồi đây 👀`,
      (name) => `Hôm nay thử ${name} xem sao nhé 🍽️`,
      (name) => `Mèo đầu bếp gợi ý: ${name} 🐱`,
    ],
    subtexts: [
      `Nạp năng lượng đi, chiều còn chiến tiếp! 💪`,
      `Bỏ bữa trưa là chiều ngủ gật đó nghen~ 😴`,
      `Dành 30 phút cho bản thân, ăn no rồi làm tiếp 🫶`,
      `Buổi trưa ngon là buổi chiều năng suất 🔋`,
      `Ăn gì ngon ngon đi, bạn xứng đáng mà 🌟`,
    ],
  },
  dinner: {
    headings: [
      (name) => `Tối nay ${name} là chuẩn rồi 🌙`,
      (name) => `Tan làm rồi, ${name} thôi nào~ 🍜`,
      (name) => `${name} — phần thưởng sau một ngày dài 🥰`,
      (name) => `Buổi tối nhẹ nhàng với ${name} nhé 🌿`,
      (name) => `Đói chưa? ${name} đang gọi tên bạn 👋`,
    ],
    subtexts: [
      `Cả ngày vất vả rồi, tối nay ăn ngon xứng đáng 🌙`,
      `Hết giờ làm rồi — thời gian cho bản thân thôi 🏠`,
      `Bữa tối ngon là ngủ ngon, ngủ ngon là ngày mai xịn 💫`,
      `Tối ăn vừa đủ, nhẹ bụng, ngủ mới sâu 😴`,
      `Kết thúc ngày bằng một bữa ngon đi bạn ơi 🌿`,
    ],
  },
};

function pickBySeed(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function useModalCopy(mealId, dishName) {
  return useMemo(() => {
    const set = MODAL_COPY[mealId] ?? MODAL_COPY.lunch;
    const seed = new Date().getMinutes() + new Date().getHours() * 60;
    const headingFn = pickBySeed(set.headings, seed);
    const subtext   = pickBySeed(set.subtexts, seed + 3);
    return { heading: headingFn(dishName), subtext };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, dishName]);
}

// ── NutritionChip ─────────────────────────────────────────────────────────────
function NutritionChip({ emoji, label, color }) {
  return (
    <View style={[styles.chip, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}


// ── MealReminderModal (component chính) ───────────────────────────────────────
export default function MealReminderModal({
  visible,
  dishName,
  mealLabel,
  mealId,
  nutrition,
  onClose,
  onNavigate,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const { heading, subtext } = useModalCopy(mealId, dishName || 'món ngon');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 60, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const lottieSrc = useMemo(() => {
    if (!dishName) return LOTTIE.no_dish;
    return LOTTIE[mealId] ?? LOTTIE.fallback;
  }, [mealId, dishName]);

  const chips = useMemo(() => {
    if (!nutrition) return [];
    const n = [];
    if (nutrition.calories != null) n.push({ emoji: '🔥', label: `${Math.round(nutrition.calories)} kcal`, color: '#E67E22' });
    if (nutrition.protein  != null) n.push({ emoji: '💪', label: `${Math.round(nutrition.protein)}g protein`, color: '#27AE60' });
    if (nutrition.fat      != null) n.push({ emoji: '🧈', label: `${Math.round(nutrition.fat)}g chất béo`, color: '#F39C12' });
    if (nutrition.carbs    != null) n.push({ emoji: '🌾', label: `${Math.round(nutrition.carbs)}g carbs`, color: '#8E44AD' });
    return n;
  }, [nutrition]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <PaperCard style={styles.card}>
            {/* Lottie minh hoạ */}
            <LottieView
              source={lottieSrc}
              autoPlay
              loop
              style={styles.lottie}
            />

            {/* Meal label badge */}
            {!!mealLabel && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{mealLabel}</Text>
              </View>
            )}

            {/* Heading */}
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.subtext}>{subtext}</Text>

            {/* Nutrition chips */}
            {chips.length > 0 && (
              <View style={styles.chipRow}>
                {chips.map((c, i) => (
                  <NutritionChip key={i} emoji={c.emoji} label={c.label} color={c.color} />
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {!!dishName && typeof onNavigate === 'function' && (
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onNavigate} activeOpacity={0.8}>
                  <Text style={styles.btnPrimaryText}>Xem chi tiết 🍽️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.btnSecondaryText}>Bỏ qua</Text>
              </TouchableOpacity>
            </View>
          </PaperCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 24,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 12,
    color: '#92400E',
  },
  heading: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 17,
    color: '#3D2B1F',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  subtext: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: '#6B5744',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  chipEmoji: { fontSize: 13 },
  chipLabel: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 12,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#8B5E3C',
  },
  btnPrimaryText: {
    fontFamily: 'BeVietnamPro-SemiBold',
    fontSize: 15,
    color: '#FFF8EA',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C8A96E',
  },
  btnSecondaryText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 14,
    color: '#8B7355',
  },
});
