import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Linking, Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { api } from '../services/api';
import { saveFeedback, loadSessions } from '../utils/database';
import { C, R, F, shadow } from '../theme';

const DishDetailScreen = ({ route, navigation }) => {
  const { dish } = route.params;
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating]         = useState(0);
  const [ingredients, setIngredients]               = useState([]);
  const [loadingDetail, setLoadingDetail]           = useState(true);

  useEffect(() => { loadDetail(); }, []);
const explanationList = []
  const loadDetail = async () => {
    try {
      const dishId = dish.dish_id || dish.id;
      if (!dishId) return;
      const res = await api.get(`/api/v1/dishes/${dishId}`);
      setIngredients(res.data.ingredients || []);
      
    } catch (e) { console.error('loadDetail:', e); }
    finally { setLoadingDetail(false); }
  };
const explanationConfig = [
  { key: "weather_reason", label: "🌦️ Thời tiết" },
  { key: "dish_match", label: "🍽️ Phù hợp món" },
  { key: "nutrition_note", label: "🥗 Dinh dưỡng" },
  { key: "ingredient_note", label: "🧄 Nguyên liệu" },
  { key: "seasonal_note", label: "🌱 Mùa vụ" },
   { key: "tags", label: "🏷️ Tags" },
]

  const handleFeedback = async (action, rating = null) => {
    try {
      const sessions = await loadSessions(1);
      if (sessions.length > 0) {
        await saveFeedback({ session_id:sessions[0].id, dish_id:dish.dish_id||dish.id,
          action, rating, feedback_at:new Date().toISOString() });
      }
      if (action === 'rated') setRatingModalVisible(false);
    } catch (e) { console.error('handleFeedback:', e); }
  };

  const ScoreBar = ({ label, value, color='#4ADE80' }) => (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width:`${Math.min(100,Math.round((value||0)*100))}%`, backgroundColor:color }]} />
      </View>
      <Text style={s.barVal}>{Math.round((value||0)*100)}%</Text>
    </View>
  );

  const breakdown = dish.score_breakdown || {};
  const mainIngredients = ingredients.filter(i => i.is_main);
  const sideIngredients = ingredients.filter(i => !i.is_main);

  return (
    <View style={{ flex:1, backgroundColor:'#FFFFF0' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Nav — cố định ngoài ScrollView */}
      <View style={s.navBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{dish.title}</Text>
        <View style={{ width:44 }} />
      </View>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:40 }}>
        {/* Hero */}
        {dish.image_url
          ? <Image source={{ uri:dish.image_url }} style={s.heroBanner} resizeMode="cover" />
          : <View style={[s.heroBanner, { backgroundColor:'#EFF6FF', justifyContent:'center', alignItems:'center' }]}>
              <Text style={{ fontSize:80 }}>🍜</Text>
            </View>
        }

        <View style={s.content}>
          <Text style={s.title}>{dish.title}</Text>
          <View style={s.metaRow}>
            {[
              `🌏 ${dish.nation || 'Việt Nam'}`,
              `⏱ ${dish.cook_time_min} phút`,
              `⭐ ${((dish.final_score||0)*100).toFixed(0)}%`,
            ].map((t) => (
              <View key={t} style={s.chip}><Text style={s.chipText}>{t}</Text></View>
            ))}
          </View>

          {/* Lý do gợi ý */}
          <View style={s.section}>
         <Text style={s.sectionTitle}>🌟 Tại sao được gợi ý</Text>

{explanationConfig.map(({ key, label }) => {
  const value = dish?.explanation?.[key]
  if (!value) return null

  return (
    <Text key={key} style={s.explanationItem}>
      • {label}: {value}
    </Text>
  )
})}

          </View>

          {/* Score */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>📊 Điểm phù hợp</Text>
            <ScoreBar label="Tổng thể"   value={dish.final_score}      color="#60A5FA" />
            {breakdown.hydration > 0 && <ScoreBar label="Hydration"   value={breakdown.hydration} color="#0EA5E9" />}
            {breakdown.warming   > 0 && <ScoreBar label="Giữ ấm"      value={breakdown.warming}   color="#FBBF24" />}
            {breakdown.cooling   > 0 && <ScoreBar label="Làm mát"     value={breakdown.cooling}   color="#4ADE80" />}
            {breakdown.boost     > 0 && <ScoreBar label="Nguyên liệu" value={breakdown.boost}     color="#A78BFA" />}
          </View>

          {/* Ingredients */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🛒 Nguyên liệu</Text>
            {loadingDetail ? (
              <ActivityIndicator color="#60A5FA" style={{ marginVertical:12 }} />
            ) : ingredients.length === 0 ? (
              <Text style={s.noData}>Không có dữ liệu nguyên liệu 😅</Text>
            ) : (
              <>
                {mainIngredients.length > 0 && (
                  <>
                    <Text style={s.ingGroupTitle}>Nguyên liệu chính</Text>
                    <View style={s.ingGrid}>
                      {mainIngredients.map(ing => (
                        <View key={ing.id} style={s.ingChip}>
                          <Text style={s.ingText}>{ing.name}</Text>
                          {ing.quantity_g > 0 && <Text style={s.ingQty}>{ing.quantity_g}g</Text>}
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {sideIngredients.length > 0 && (
                  <>
                    <Text style={[s.ingGroupTitle, { marginTop:12 }]}>Gia vị & phụ liệu</Text>
                    <View style={s.ingGrid}>
                      {sideIngredients.map(ing => (
                        <View key={ing.id} style={s.ingChipSide}>
                          <Text style={s.ingTextSide}>{ing.name}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </View>

          {/* Serving suggestion */}
          {dish.serving_suggestion ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🍽️ Gợi ý phục vụ</Text>
              <Text style={s.bodyText}>{dish.serving_suggestion}</Text>
            </View>
          ) : null}

          {/* Recipe link */}
          {dish.url ? (
            <TouchableOpacity style={s.recipeBtn} onPress={() => Linking.openURL(dish.url)}>
              <Text style={s.recipeBtnText}>📖 Xem công thức đầy đủ</Text>
            </TouchableOpacity>
          ) : null}

          {/* Feedback */}
          <View style={s.section}>
            <Text style={s.feedbackQ}>Bạn có muốn ăn món này không? 😋</Text>
            <View style={s.feedbackRow}>
              {[
                { label:'😋 Đã ăn',  color:'#4ADE80', action:'eaten' },
                { label:'⭐ Đánh giá', color:'#FBBF24', action:'rate' },
                { label:'✕ Bỏ qua', color:'#F87171', action:'skipped' },
              ].map(({ label, color, action }) => (
                <TouchableOpacity key={label}
                  style={[s.fbBtn, { backgroundColor:color }]}
                  onPress={() => action==='rate' ? setRatingModalVisible(true) : handleFeedback(action)}>
                  <Text style={s.fbBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Rating Modal ─────────────────────────────── */}
      <Modal visible={ratingModalVisible} transparent animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>⭐ Đánh giá món ăn</Text>
            <Text style={s.modalSub}>Bạn thấy {dish.title} thế nào?</Text>
            <View style={s.starsRow}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}
                  activeOpacity={0.7} style={s.starBtn}>
                  <Text style={[s.starIcon, star <= selectedRating && s.starActive]}>
                    {star <= selectedRating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalBtnCancel}
                onPress={() => setRatingModalVisible(false)}>
                <Text style={s.modalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnConfirm, selectedRating === 0 && { opacity:0.4 }]}
                disabled={selectedRating === 0}
                onPress={() => handleFeedback('rated', selectedRating)}>
                <Text style={s.modalBtnConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:       { flex:1, backgroundColor:'#FFFFF0' },
  navBar:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                     paddingHorizontal:16, paddingTop:52, paddingBottom:12,
                     backgroundColor:'#FFFFFF', borderBottomWidth:1.5,
                     borderBottomColor:'#E5E7EB', borderStyle:'dashed' },
  backBtn:         { width:44, height:44, borderRadius:999, backgroundColor:'#EFF6FF',
                     alignItems:'center', justifyContent:'center' },
  backIcon:        { fontSize:22, color:'#60A5FA' },
  navTitle:        { flex:1, textAlign:'center', fontSize:17, fontFamily:'Patrick Hand',
                     color:'#1A291A', marginHorizontal:8 },
  heroBanner:      { width:'100%', height:220 },
  content:         { padding:20 },
  title:           { fontSize:26, fontFamily:'Patrick Hand', color:'#1A291A',
                     lineHeight:32, marginBottom:10 },
  metaRow:         { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 },
  chip:            { backgroundColor:'#EFF6FF', paddingHorizontal:14, paddingVertical:6,
                     borderRadius:999, borderWidth:1, borderColor:'rgba(96,165,250,0.4)' },
  chipText:        { fontSize:14, color:'#60A5FA', fontFamily:'Nunito' },
  section:         { marginBottom:20, backgroundColor:'#FFFFFF', borderRadius:16,
                     padding:16, borderWidth:1.5, borderColor:'#E5E7EB',
                     borderStyle:'dashed' },
  sectionTitle:    { fontSize:17, fontFamily:'Patrick Hand', color:'#1A291A',
                     marginBottom:12 },
  explanationItem: { fontSize:15, color:'#4E6350', lineHeight:22,
                     fontFamily:'Nunito', marginBottom:4 },
  bodyText:        { fontSize:15, color:'#4E6350', lineHeight:22, fontFamily:'Nunito' },
  noData:          { fontSize:14, color:'#8EA08E', fontFamily:'Nunito' },
  barRow:          { flexDirection:'row', alignItems:'center', marginBottom:8 },
  barLabel:        { width:80, fontSize:13, color:'#4E6350', fontFamily:'Nunito' },
  barTrack:        { flex:1, height:10, backgroundColor:'#F0F4F0', borderRadius:999,
                     overflow:'hidden', marginHorizontal:8 },
  barFill:         { height:'100%', borderRadius:999 },
  barVal:          { width:36, fontSize:12, color:'#8EA08E', fontFamily:'Nunito',
                     textAlign:'right' },
  ingGroupTitle:   { fontSize:14, fontFamily:'Nunito', fontWeight:'700',
                     color:'#4E6350', marginBottom:8 },
  ingGrid:         { flexDirection:'row', flexWrap:'wrap', gap:8 },
  ingChip:         { flexDirection:'row', alignItems:'center', backgroundColor:'#EFF6FF',
                     paddingHorizontal:12, paddingVertical:6, borderRadius:999,
                     borderWidth:1, borderColor:'rgba(96,165,250,0.4)' },
  ingText:         { fontSize:13, color:'#3B82F6', fontFamily:'Nunito' },
  ingQty:          { fontSize:11, color:'#93C5FD', fontFamily:'Nunito', marginLeft:4 },
  ingChipSide:     { backgroundColor:'#F8FAF7', paddingHorizontal:12, paddingVertical:6,
                     borderRadius:999, borderWidth:1, borderColor:'#DEE8DE' },
  ingTextSide:     { fontSize:13, color:'#4E6350', fontFamily:'Nunito' },
  recipeBtn:       { backgroundColor:'#60A5FA', borderRadius:16, paddingVertical:14,
                     alignItems:'center', marginBottom:20 },
  recipeBtnText:   { fontSize:16, color:'#FFFFFF', fontFamily:'Patrick Hand' },
  feedbackQ:       { fontSize:16, fontFamily:'Patrick Hand', color:'#1A291A',
                     marginBottom:12, textAlign:'center' },
  feedbackRow:     { flexDirection:'row', gap:10, justifyContent:'center' },
  fbBtn:           { flex:1, paddingVertical:12, borderRadius:16,
                     alignItems:'center', maxWidth:110 },
  fbBtnText:       { fontSize:13, color:'#FFFFFF', fontFamily:'Nunito', fontWeight:'700' },
  modalOverlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.45)',
                       justifyContent:'center', alignItems:'center', padding:24 },
  modalCard:         { backgroundColor:'#FFFFFF', borderRadius:24, padding:28,
                       width:'100%', alignItems:'center',
                       borderWidth:1.5, borderColor:'#E5E7EB', borderStyle:'dashed' },
  modalTitle:        { fontSize:22, fontFamily:'Patrick Hand', color:'#1A291A',
                       marginBottom:6 },
  modalSub:          { fontSize:15, fontFamily:'Nunito', color:'#4E6350',
                       marginBottom:20, textAlign:'center' },
  starsRow:          { flexDirection:'row', gap:8, marginBottom:24 },
  starBtn:           { padding:4 },
  starIcon:          { fontSize:36, color:'#D1D5DB' },
  starActive:        { color:'#FBBF24' },
  modalActions:      { flexDirection:'row', gap:12, width:'100%' },
  modalBtnCancel:    { flex:1, paddingVertical:14, borderRadius:16, alignItems:'center',
                       borderWidth:2, borderColor:'#60A5FA', borderStyle:'dashed' },
  modalBtnCancelText:{ fontSize:15, color:'#60A5FA', fontFamily:'Patrick Hand' },
  modalBtnConfirm:   { flex:1, paddingVertical:14, borderRadius:16, alignItems:'center',
                       backgroundColor:'#60A5FA' },
  modalBtnConfirmText:{ fontSize:15, color:'#FFFFFF', fontFamily:'Patrick Hand' },
});

export default DishDetailScreen;
