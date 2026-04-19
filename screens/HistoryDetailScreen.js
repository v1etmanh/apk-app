import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { loadDishesBySession, loadFeedbackBySession } from '../utils/database';
import { C, R, F, shadow } from '../theme';

const ACTION_LABEL = {
  eaten:   { text: 'Đã ăn',    emoji: '😋', color: '#4ADE80', bg: '#DCFCE7' },
  skipped: { text: 'Bỏ qua',   emoji: '⏭️', color: '#F87171', bg: '#FEE2E2' },
  rated:   { text: 'Đánh giá', emoji: '⭐', color: '#FBBF24', bg: '#FEF9C3' },
};

const HistoryDetailScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const [dishes,   setDishes]   = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [d, fb] = await Promise.all([
        loadDishesBySession(sessionId),
        loadFeedbackBySession(sessionId),
      ]);
      const fbMap = {};
      fb.forEach(f => { fbMap[f.dish_id] = f; });
      setDishes(d);
      setFeedback(fbMap);
    } catch (e) {
      console.error('HistoryDetail load:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* Nav */}
      <View style={st.nav}>
        <TouchableOpacity style={st.back} onPress={() => navigation.goBack()}>
          <Text style={st.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={st.navTitle}>Chi tiết phiên gợi ý</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* Summary chip */}
        <View style={st.summaryRow}>
          <View style={st.summaryChip}>
            <Text style={st.summaryText}>🍽️ {dishes.length} món được gợi ý</Text>
          </View>
          <View style={[st.summaryChip, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[st.summaryText, { color: '#166534' }]}>
              😋 {Object.values(feedback).filter(f => f.action_type === 'eaten').length} đã ăn
            </Text>
          </View>
        </View>

        {dishes.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyIcon}>🍜</Text>
            <Text style={st.emptyText}>Không có dữ liệu món ăn</Text>
          </View>
        ) : (
          dishes.map((dish, i) => {
            const fb = feedback[dish.dish_id];
            const action = fb ? ACTION_LABEL[fb.action_type] : null;
            return (
              <View key={dish.dish_id || i} style={st.card}>
                <View style={st.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dishTitle} numberOfLines={2}>{dish.title}</Text>
                    <View style={st.metaRow}>
                      {dish.cook_time_min > 0 && (
                        <Text style={st.metaChip}>⏱ {dish.cook_time_min} phút</Text>
                      )}
                      {dish.nation && (
                        <Text style={st.metaChip}>🌏 {dish.nation}</Text>
                      )}
                    </View>
                  </View>
                  {action && (
                    <View style={[st.actionPill, { backgroundColor: action.bg }]}>
                      <Text style={[st.actionText, { color: action.color }]}>
                        {action.emoji} {action.text}
                      </Text>
                    </View>
                  )}
                </View>
                {fb?.rating && (
                  <View style={st.ratingRow}>
                    {[1,2,3,4,5].map(n => (
                      <Text key={n} style={{ fontSize: 16, color: n <= fb.rating ? '#FBBF24' : '#E5E7EB' }}>★</Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const st = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#FFFFF0' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFF0' },
  nav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
                 borderBottomWidth: 2, borderBottomColor: '#E5E7EB', borderStyle: 'dashed' },
  back:        { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { fontSize: 28, color: '#60A5FA', fontWeight: '300', lineHeight: 34 },
  navTitle:    { fontSize: 20, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  scroll:      { padding: 16 },
  summaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryChip: { backgroundColor: '#EFF6FF', borderRadius: 9999, paddingHorizontal: 14,
                 paddingVertical: 7 },
  summaryText: { fontSize: 14, fontWeight: '700', color: '#60A5FA' },
  empty:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 18, color: '#9CA3AF', fontFamily: 'Nunito' },
  card:        { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
                 marginBottom: 12, borderWidth: 2, borderColor: '#E5E7EB',
                 borderStyle: 'dashed',
                 shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                 shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dishTitle:   { fontSize: 18, fontFamily: 'Nunito', fontWeight: '700', color: '#1E1E1E',
                 marginBottom: 8, flex: 1 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip:    { fontSize: 13, backgroundColor: '#F3F4F6', paddingHorizontal: 10,
                 paddingVertical: 4, borderRadius: 9999, color: '#6B7280', fontWeight: '600' },
  actionPill:  { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5,
                 alignSelf: 'flex-start', marginTop: 2 },
  actionText:  { fontSize: 13, fontWeight: '700' },
  ratingRow:   { flexDirection: 'row', marginTop: 10, gap: 2 },
});

export default HistoryDetailScreen;
