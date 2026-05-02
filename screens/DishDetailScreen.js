import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Linking, Image, ActivityIndicator, StatusBar, Animated, ImageBackground, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { loadSessions } from '../utils/database';
import { C, shadow } from '../theme';
import MetaChip from '../components/ui/MetaChip';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';
import ScreenBackground from '../components/ui/ScreenBackground';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 320;

const ASSETS = {
  wood: require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// Tách ingredient_source_note thành các dòng con có icon riêng
const parseSourceNote = (text) => {
  if (!text) return null;
  // Tách 3 câu: [0] "X chủ yếu đến từ...", [1] "...tổng hợp...", [2] "Phương pháp..."
  const parts = text.split(/(?<=\.)\s+(?=[A-ZĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])/u);
  return parts.filter(Boolean);
};

// Thứ tự hiển thị các row giải thích — KHÔNG bao gồm headline và tags (xử lý riêng)
// ingredient_source_note và active_reasons được xử lý riêng bên dưới
const explanationConfig = [
  { key: "weather_reason",         label: "Thời tiết",        icon: "partly-sunny-outline",  color: C.accentGold  || '#C8860A' },
  { key: "dish_match",             label: "Phù hợp",          icon: "restaurant-outline",    color: C.accentBlue || '#3498DB' },
  { key: "ingredient_source_note", label: "Vì sao có chỉ số này", icon: "flask-outline",     color: '#8B5CF6' },
  { key: "nutrition_note",         label: "Dinh dưỡng",       icon: "leaf-outline",          color: C.accentGreen || '#38B07A' },
  { key: "ingredient_note",        label: "Giỏ hàng",         icon: "basket-outline",        color: '#A78BFA' },
  { key: "seasonal_note",          label: "Mùa vụ",           icon: "calendar-outline",      color: '#EC4899' },
];

// Map active_reason code → nhãn hiển thị ngắn gọn
const REASON_LABELS = {
  "weather_cooling":      { label: "Mát",            icon: "snow-outline",           color: '#2DD4BF' },
  "weather_warming":      { label: "Giữ ấm",         icon: "flame-outline",          color: '#F97316' },
  "weather_hydration":    { label: "Bù nước",        icon: "water-outline",          color: '#3B82F6' },
  "weather_energy":       { label: "Năng lượng",     icon: "flash-outline",          color: '#FBBF24' },
  "disease_hypertension": { label: "Ít muối",        icon: "heart-outline",          color: '#EF4444' },
  "disease_diabetes":     { label: "GL thấp",        icon: "fitness-outline",        color: '#10B981' },
  "disease_gout":         { label: "Ít purine",      icon: "medical-outline",        color: '#6366F1' },
  "bmi_overweight":       { label: "Ít calo",        icon: "scale-outline",          color: '#F59E0B' },
  "bmi_underweight":      { label: "Bổ năng lượng",  icon: "barbell-outline",        color: '#84CC16' },
  "location_season":      { label: "Hợp mùa vụ",    icon: "leaf-outline",           color: '#34D399' },
};

const DishDetailScreen = ({ route, navigation }) => {
  const { dish } = route.params;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating]         = useState(0);
  const [ingredients, setIngredients]               = useState([]);
  const [loadingDetail, setLoadingDetail]           = useState(true);
  const [feedbackState, setFeedbackState]           = useState({}); // { eaten: 'loading'|'done'|'error' }

  useEffect(() => { loadDetail(); }, []);

  const loadDetail = async () => {
    try {
      const dishId = dish.dish_id || dish.id;
      if (!dishId) return;
      const res = await api.get(`/api/v1/dishes/${dishId}`);
      setIngredients(res.data.ingredients || []);
    } catch (e) { console.error('loadDetail:', e); }
    finally { setLoadingDetail(false); }
  };

  const handleFeedback = async (action, rating = null) => {
    const dishId = dish.dish_id || dish.id;
    setFeedbackState(prev => ({ ...prev, [action]: 'loading' }));
    try {
      // Lấy session_uuid từ local storage (nếu có)
      let sessionUuid = '';
      try {
        const sessions = await loadSessions(1);
        if (sessions.length > 0) sessionUuid = String(sessions[0].id);
      } catch (_) {}

      await api.post('/api/v1/feedback', {
        session_uuid: sessionUuid,
        dish_id:      String(dishId),
        action,
        rating:       rating ?? undefined,
        feedback_at:  new Date().toISOString(),
      });

      setFeedbackState(prev => ({ ...prev, [action]: 'done' }));
      if (action === 'rated') setRatingModalVisible(false);
    } catch (e) {
      console.error('handleFeedback:', e);
      setFeedbackState(prev => ({ ...prev, [action]: 'error' }));
      // Reset error sau 2s để user có thể thử lại
      setTimeout(() => setFeedbackState(prev => ({ ...prev, [action]: undefined })), 2000);
    }
  };

  // Metric Card for Scores
  const MetricCard = ({ label, value, color, icon }) => (
    <View style={s.metricCard}>
      <View style={[s.metricIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={s.metricInfo}>
        <Text style={s.metricLabel}>{label}</Text>
        <View style={s.metricTrack}>
          <View style={[s.metricFill, { width: `${Math.min(100, Math.round((value || 0) * 100))}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[s.metricVal, { color: color }]}>{Math.round((value || 0) * 100)}%</Text>
    </View>
  );

  const breakdown = dish.score_breakdown || {};
  const mainIngredients = ingredients.filter(i => i.is_main);
  const sideIngredients = ingredients.filter(i => !i.is_main);

  // Header Animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 100, HERO_HEIGHT - 50],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  return (
    <ImageBackground 
      source={ASSETS.paper} 
      style={s.container} 
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Floating Header ────────────────────────────────────────── */}
      <Animated.View style={[s.floatingHeader, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
        <ImageBackground source={ASSETS.paper} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.95 }} resizeMode="cover" />
        <View style={s.headerInner}>
          <Text style={s.headerTitle} numberOfLines={1}>{dish.title}</Text>
        </View>
      </Animated.View>
      
      {/* Back Button Overlay */}
      <TouchableOpacity 
        style={[s.backBtnOverlay, { top: insets.top + 8 }]} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <View style={s.backBtnBlur}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </View>
      </TouchableOpacity>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 60 + insets.bottom }
        ]}
        style={s.scrollView}
      >
        {/* ── Hero Parallax ────────────────────────────────────────── */}
        <Animated.View style={[s.heroContainer, { transform: [{ scale: heroScale }] }]}>
          {dish.image_url ? (
            <Image source={{ uri: dish.image_url }} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={[s.heroImage, { backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 80 }}>🍜</Text>
            </View>
          )}
          {/* Gradient Overlay for text readability */}
          <View style={s.heroGradient} />
        </Animated.View>

        {/* ── Content ──────────────────────────────────────────────── */}
        <View style={s.contentContainer}>
          
          {/* ── Title & Meta Stats Card ── */}
          <View style={s.titleCard}>
            <ImageBackground source={ASSETS.paper} style={s.titleCardBg} imageStyle={{ borderRadius: 24, opacity: 0.95 }} resizeMode="cover">
              <View style={s.titleCardInner}>
                <Text style={s.mainTitle}>{dish.title}</Text>
                <View style={s.metaChipsRow}>
                  <MetaChip icon={<Ionicons name="time-outline" size={13} color={C.textMid}/>} label={`${dish.cook_time_min}p`} style={s.chipSpacing} />
                  <MetaChip icon={<Ionicons name="earth" size={13} color={C.accentBlue}/>} label={dish.nation || 'Việt Nam'} style={s.chipSpacing} />
                  <MetaChip variant="accent" icon={<Ionicons name="star" size={13} color={C.accentGreen}/>} label={`${((dish.final_score||0)*100).toFixed(0)}%`} style={s.chipSpacing} />
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* ── Why Recommended (Expert Note) ── */}
          {dish.explanation && Object.keys(dish.explanation).length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Ghi chú từ bếp" icon="document-text-outline" />
              <PaperCard priority="primary" innerStyle={{ padding: 18 }}>

                {/* Headline — banner nổi bật đầu card */}
                {dish.explanation.headline ? (
                  <View style={s.headlineBanner}>
                    <Ionicons name="sparkles-outline" size={15} color={C.accentGold || '#C8860A'} style={{ marginRight: 8, marginTop: 1 }} />
                    <Text style={s.headlineText}>{dish.explanation.headline}</Text>
                  </View>
                ) : null}

                {/* ── Active Reasons pills — "Món này fit vì..." ── */}
                {Array.isArray(dish.explanation.active_reasons) && dish.explanation.active_reasons.length > 0 && (
                  <View style={s.activeReasonsBlock}>
                    <Text style={s.activeReasonsLabel}>Phù hợp với bạn vì</Text>
                    <View style={s.activeReasonsPills}>
                      {dish.explanation.active_reasons.map((reason) => {
                        const info = REASON_LABELS[reason];
                        if (!info) return null;
                        return (
                          <View key={reason} style={[s.reasonPill, { backgroundColor: info.color + '15', borderColor: info.color + '40' }]}>
                            <Ionicons name={info.icon} size={12} color={info.color} style={{ marginRight: 4 }} />
                            <Text style={[s.reasonPillText, { color: info.color }]}>{info.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Divider sau active_reasons nếu có */}
                {Array.isArray(dish.explanation.active_reasons) && dish.explanation.active_reasons.length > 0 && (
                  <View style={s.sectionDivider} />
                )}

                {/* Các row giải thích theo thứ tự trong explanationConfig */}
                {explanationConfig.map(({ key, label, icon, color }) => {
                  const value = dish?.explanation?.[key];
                  if (!value) return null;

                  // ingredient_source_note — render dạng card nổi bật với sub-lines
                  if (key === 'ingredient_source_note') {
                    const sourceParts = parseSourceNote(value);
                    const subIcons = ['list-outline', 'calculator-outline', 'flame-outline'];
                    return (
                      <View key={key} style={s.sourceNoteBlock}>
                        <View style={s.sourceNoteHeader}>
                          <View style={[s.noteIconBox, { backgroundColor: color + '18' }]}>
                            <Ionicons name={icon} size={14} color={color} />
                          </View>
                          <Text style={[s.noteLabel, { color, marginLeft: 8, alignSelf: 'center' }]}>{label}</Text>
                        </View>
                        <View style={[s.sourceNoteBody, { borderLeftColor: color + '50' }]}>
                          {sourceParts && sourceParts.length > 1 ? (
                            sourceParts.map((part, idx) => (
                              <View key={idx} style={s.sourceNoteLine}>
                                <Ionicons
                                  name={subIcons[idx] || 'ellipse-outline'}
                                  size={12}
                                  color={color}
                                  style={s.sourceNoteLineIcon}
                                />
                                <Text style={s.sourceNoteText}>{part}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={s.sourceNoteText}>{value}</Text>
                          )}
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={key} style={s.noteRow}>
                      <View style={[s.noteIconBox, { backgroundColor: color + '18' }]}>
                        <Ionicons name={icon} size={14} color={color} />
                      </View>
                      <View style={s.noteTextWrap}>
                        <Text style={[s.noteLabel, { color }]}>{label}</Text>
                        <Text style={s.noteText}>{value}</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Tags — pills ngang */}
                {Array.isArray(dish.explanation.tags) && dish.explanation.tags.length > 0 && (
                  <View style={s.tagsWrap}>
                    {dish.explanation.tags.map((tag, i) => (
                      <View key={i} style={s.tagPill}>
                        <Text style={s.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

              </PaperCard>
            </View>
          )}

          {/* ── Score Breakdown ── */}
          <View style={s.section}>
            <SectionHeader title="Phân tích độ phù hợp" icon="analytics-outline" />
            <PaperCard innerStyle={{ padding: 16, gap: 12 }}>
              <MetricCard label="Tổng thể" value={dish.final_score} color={C.accentGreen || '#38B07A'} icon="checkmark-circle" />
              {breakdown.hydration > 0 && <MetricCard label="Cấp nước" value={breakdown.hydration} color={C.accentBlue || '#3498DB'} icon="water" />}
              {breakdown.warming   > 0 && <MetricCard label="Giữ ấm" value={breakdown.warming} color={C.accentGold || '#F59E0B'} icon="thermometer" />}
              {breakdown.cooling   > 0 && <MetricCard label="Làm mát" value={breakdown.cooling} color="#2DD4BF" icon="snow" />}
              {breakdown.boost     > 0 && <MetricCard label="Nguyên liệu có sẵn" value={breakdown.boost} color="#A78BFA" icon="basket" />}
            </PaperCard>
          </View>

          {/* ── Ingredients Pantry ── */}
          <View style={s.section}>
            <SectionHeader title="Tủ nguyên liệu" icon="cart-outline" />
            
            {loadingDetail ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
            ) : ingredients.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="fast-food-outline" size={32} color={C.border} />
                <Text style={s.emptyText}>Chưa có thông tin nguyên liệu</Text>
              </View>
            ) : (
              <View style={s.pantryContainer}>
                {mainIngredients.length > 0 && (
                  <View style={s.pantryGroup}>
                    <Text style={s.pantryTitle}>Nguyên liệu chính</Text>
                    <View style={s.ingGrid}>
                      {mainIngredients.map(ing => (
                        <View key={ing.id} style={s.ingChipMain}>
                          <Text style={s.ingTextMain}>{ing.name}</Text>
                          {ing.quantity_g > 0 && (
                            <View style={s.ingQtyBadge}>
                              <Text style={s.ingQtyText}>{ing.quantity_g}g</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {sideIngredients.length > 0 && (
                  <View style={[s.pantryGroup, { marginTop: 16 }]}>
                    <Text style={s.pantryTitle}>Gia vị & Phụ liệu</Text>
                    <View style={s.ingGrid}>
                      {sideIngredients.map(ing => (
                        <View key={ing.id} style={s.ingChipSide}>
                          <Text style={s.ingTextSide}>{ing.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Serving suggestion ── */}
          {dish.serving_suggestion ? (
            <View style={s.section}>
              <SectionHeader title="Gợi ý thưởng thức" icon="restaurant-outline" />
              <PaperCard innerStyle={{ padding: 16 }}>
                <Text style={s.servingText}>{dish.serving_suggestion}</Text>
              </PaperCard>
            </View>
          ) : null}

          {/* ── Recipe Link ── */}
          {dish.url ? (
            <TouchableOpacity 
              style={s.recipeBtn} 
              activeOpacity={0.85}
              onPress={() => Linking.openURL(dish.url)}
            >
              <ImageBackground source={ASSETS.wood} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: 16, opacity: 0.9 }} resizeMode="cover" />
              <View style={s.recipeBtnInner}>
                <Ionicons name="book-outline" size={20} color="#FFFFFF" />
                <Text style={s.recipeBtnText}>Xem công thức đầy đủ</Text>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* ── Feedback Actions ── */}
          <View style={s.feedbackSection}>
            <Text style={s.feedbackQuestion}>Quyết định của bạn hôm nay?</Text>
            <View style={s.feedbackRow}>

              {/* Đã Ăn */}
              <TouchableOpacity
                style={[s.actionStamp, { borderColor: C.accentGreen, backgroundColor: C.accentGreen + '10' },
                  feedbackState.eaten === 'done'  && { backgroundColor: C.accentGreen + '25', borderStyle: 'solid' },
                  feedbackState.eaten === 'error' && { borderColor: '#E74C3C' },
                ]}
                activeOpacity={0.7}
                disabled={feedbackState.eaten === 'loading' || feedbackState.eaten === 'done'}
                onPress={() => handleFeedback('eaten')}
              >
                <View style={[s.actionIconBox, { backgroundColor: C.accentGreen }]}>
                  {feedbackState.eaten === 'loading'
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : feedbackState.eaten === 'done'
                      ? <Ionicons name="checkmark-done" size={18} color="#FFF" />
                      : feedbackState.eaten === 'error'
                        ? <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
                        : <Ionicons name="checkmark-done" size={18} color="#FFF" />}
                </View>
                <Text style={[s.actionStampText, { color: C.accentGreen }]}>
                  {feedbackState.eaten === 'done' ? 'Đã Lưu!' : feedbackState.eaten === 'error' ? 'Lỗi!' : 'Đã Ăn'}
                </Text>
              </TouchableOpacity>

              {/* Đánh Giá */}
              <TouchableOpacity
                style={[s.actionStamp, { borderColor: C.accentGold || '#F59E0B', backgroundColor: (C.accentGold || '#F59E0B') + '10' },
                  feedbackState.rated === 'done'  && { backgroundColor: (C.accentGold || '#F59E0B') + '25', borderStyle: 'solid' },
                  feedbackState.rated === 'error' && { borderColor: '#E74C3C' },
                ]}
                activeOpacity={0.7}
                disabled={feedbackState.rated === 'loading'}
                onPress={() => setRatingModalVisible(true)}
              >
                <View style={[s.actionIconBox, { backgroundColor: C.accentGold || '#F59E0B' }]}>
                  {feedbackState.rated === 'loading'
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : feedbackState.rated === 'done'
                      ? <Ionicons name="star" size={18} color="#FFF" />
                      : <Ionicons name="star" size={18} color="#FFF" />}
                </View>
                <Text style={[s.actionStampText, { color: C.accentGold || '#F59E0B' }]}>
                  {feedbackState.rated === 'done' ? 'Đã Lưu!' : 'Đánh Giá'}
                </Text>
              </TouchableOpacity>

              {/* Bỏ Qua */}
              <TouchableOpacity
                style={[s.actionStamp, { borderColor: C.accentRed || '#E74C3C', backgroundColor: (C.accentRed || '#E74C3C') + '10' },
                  feedbackState.skipped === 'done'  && { backgroundColor: (C.accentRed || '#E74C3C') + '25', borderStyle: 'solid' },
                  feedbackState.skipped === 'error' && { borderColor: '#E74C3C' },
                ]}
                activeOpacity={0.7}
                disabled={feedbackState.skipped === 'loading' || feedbackState.skipped === 'done'}
                onPress={() => handleFeedback('skipped')}
              >
                <View style={[s.actionIconBox, { backgroundColor: C.accentRed || '#E74C3C' }]}>
                  {feedbackState.skipped === 'loading'
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : feedbackState.skipped === 'done'
                      ? <Ionicons name="checkmark" size={18} color="#FFF" />
                      : feedbackState.skipped === 'error'
                        ? <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
                        : <Ionicons name="close" size={18} color="#FFF" />}
                </View>
                <Text style={[s.actionStampText, { color: C.accentRed || '#E74C3C' }]}>
                  {feedbackState.skipped === 'done' ? 'Đã Lưu!' : feedbackState.skipped === 'error' ? 'Lỗi!' : 'Bỏ Qua'}
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── Rating Modal ─────────────────────────────── */}
      <Modal visible={ratingModalVisible} transparent animationType="fade" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={s.modalOverlay}>
          <ImageBackground source={ASSETS.paper} style={s.modalCard} imageStyle={{ borderRadius: 24, opacity: 0.98 }} resizeMode="cover">
            <View style={s.modalInner}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Đánh giá món ăn</Text>
                <TouchableOpacity onPress={() => setRatingModalVisible(false)} style={s.closeModalBtn}>
                  <Ionicons name="close" size={24} color={C.textLight} />
                </TouchableOpacity>
              </View>
              
              <Text style={s.modalSub}>Món "{dish.title}" hôm nay thế nào?</Text>
              
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setSelectedRating(star)}
                    activeOpacity={0.7} 
                    style={[s.starBtn, selectedRating === star && s.starBtnActive]}
                  >
                    <Ionicons 
                      name={star <= selectedRating ? "star" : "star-outline"} 
                      size={32} 
                      color={star <= selectedRating ? (C.accentGold || '#F59E0B') : C.border} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={[s.modalConfirmBtn, selectedRating === 0 && { opacity: 0.5 }]}
                disabled={selectedRating === 0}
                onPress={() => handleFeedback('rated', selectedRating)}
                activeOpacity={0.8}
              >
                <ImageBackground source={ASSETS.wood} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: 18, opacity: 0.9 }} />
                <Text style={s.modalConfirmText}>Gửi Đánh Giá</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: C.bg, 
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    ...shadow(4),
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerInner: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: C.text,
  },
  
  // Back Button Overlay
  backBtnOverlay: {
    position: 'absolute',
    left: 16,
    zIndex: 101,
    width: 44, height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnBlur: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadow(2),
  },

  // Hero Section
  heroContainer: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // In standard RN, we simulate gradient with semi-transparent views if expo-linear-gradient is not imported.
    // We'll use a simple dark overlay at the bottom.
    borderBottomWidth: 60,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    borderTopWidth: 60,
    borderTopColor: 'transparent',
  },

  // Content
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -40, // Pull up over the hero image
  },

  // Title Card
  titleCard: {
    borderRadius: 24,
    ...shadow(6),
    marginBottom: 24,
  },
  titleCardBg: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  titleCardInner: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  mainTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: C.text,
    lineHeight: 34,
    marginBottom: 16,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipSpacing: {
    marginRight: 8,
    marginBottom: 8,
  },

  // Sections
  section: {
    marginBottom: 24,
  },

  // Expert Notes
  noteRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  noteIconBox: {
    width: 32, height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  noteTextWrap: {
    flex: 1,
  },
  noteLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noteText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: C.textMid,
    lineHeight: 22,
  },

  // Headline banner — đầu card "Ghi chú từ bếp"
  headlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: (C.accentGold || '#C8860A') + '12',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: C.accentGold || '#C8860A',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  headlineText: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Tags pills
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  tagPill: {
    backgroundColor: (C.accentBlue || '#3498DB') + '12',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: (C.accentBlue || '#3498DB') + '30',
  },
  tagText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: C.accentBlue || '#3498DB',
  },

  // Metrics
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 36, height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricInfo: {
    flex: 1,
    marginRight: 12,
  },
  metricLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: C.textMid,
    marginBottom: 6,
  },
  metricTrack: {
    height: 8,
    backgroundColor: 'rgba(92,58,30,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricVal: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    width: 40,
    textAlign: 'right',
  },

  // Pantry
  pantryContainer: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  pantryGroup: {
    marginBottom: 8,
  },
  pantryTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: C.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingChipMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(160,120,74,0.3)',
    ...shadow(1),
  },
  ingTextMain: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: C.text,
  },
  ingQtyBadge: {
    backgroundColor: 'rgba(160,120,74,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  ingQtyText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: C.woodLight || '#A67C52',
  },
  ingChipSide: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  ingTextSide: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: C.textMid,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: C.textLight,
    marginTop: 8,
  },

  // Serving Text
  servingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: C.text,
    lineHeight: 24,
  },

  // Recipe Button
  recipeBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 32,
    ...shadow(4),
  },
  recipeBtnInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(92,58,30,0.6)',
  },
  recipeBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFF',
    marginLeft: 10,
  },

  // Feedback Stamps
  feedbackSection: {
    marginTop: 10,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'center',
  },
  feedbackQuestion: {
    fontFamily: 'Patrick Hand',
    fontSize: 18,
    color: C.text,
    marginBottom: 20,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  actionStamp: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 100,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  actionIconBox: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...shadow(2),
  },
  actionStampText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    ...shadow(8),
  },
  modalInner: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: C.text,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: C.textMid,
    marginBottom: 24,
    lineHeight: 22,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  starBtn: {
    padding: 4,
    transform: [{ scale: 1 }],
  },
  starBtnActive: {
    transform: [{ scale: 1.1 }],
  },
  modalConfirmBtn: {
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFF',
    position: 'absolute',
    zIndex: 2,
  },

  // ── Active Reasons block
  activeReasonsBlock: {
    marginBottom: 14,
  },
  activeReasonsLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: C.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activeReasonsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  reasonPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
  },

  // ── Section divider inside card
  sectionDivider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: 14,
    opacity: 0.6,
  },

  // ── Ingredient source note (truy nguyên chỉ số)
  sourceNoteBlock: {
    marginBottom: 16,
  },
  sourceNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceNoteBody: {
    borderLeftWidth: 2,
    marginLeft: 16,
    paddingLeft: 12,
    gap: 8,
  },
  sourceNoteLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  sourceNoteLineIcon: {
    marginTop: 3,
    flexShrink: 0,
  },
  sourceNoteText: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: C.textMid,
    lineHeight: 21,
  },
});


export default DishDetailScreen;
