import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar,
} from 'react-native';
import { loadSessions, loadDishesBySession, loadFeedbackBySession } from '../utils/database';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString())
    return 'Hôm nay · ' + date.toLocaleDateString('vi-VN');
  if (date.toDateString() === yesterday.toDateString())
    return 'Hôm qua · ' + date.toLocaleDateString('vi-VN');
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
};

const HistoryScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const raw = await loadSessions(20);
      const enriched = await Promise.all(
        raw.map(async (s) => {
          const [dishes, fb] = await Promise.all([
            loadDishesBySession(s.id),
            loadFeedbackBySession(s.id),
          ]);
          const eatenIds = new Set(
            fb.filter(f => f.action_type === 'eaten').map(f => f.dish_id)
          );
          return {
            ...s,
            dishes: dishes.slice(0, 3),
            eatenCount: dishes.filter(d => eatenIds.has(d.dish_id)).length,
          };
        })
      );
      setSessions(enriched);
    } catch (e) { console.error('loadHistory:', e); }
  };

  const totalEaten = sessions.reduce((s, x) => s + x.eatenCount, 0);

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={st.card}
      onPress={() => navigation.navigate('HistoryDetail', { sessionId: item.id })}
      activeOpacity={0.8}
    >
      <View style={st.cardHeader}>
        <Text style={st.dateText}>🌤️ {formatDate(item.created_at)}</Text>
        <Text style={st.timeText}>
          {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {item.province ? (
        <Text style={st.locationText}>📍 {item.province}</Text>
      ) : null}
      <View style={st.cardFooter}>
        <View style={st.chip}>
          <Text style={st.chipText}>🍽️ {item.dishes.length} món gợi ý</Text>
        </View>
        {item.eatenCount > 0 && (
          <View style={[st.chip, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[st.chipText, { color: '#166534' }]}>😋 Đã ăn {item.eatenCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={i => String(i.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.list}
        ListHeaderComponent={() => (
          <View>
            <View style={st.header}>
              <Text style={st.title}>Lịch sử gợi ý</Text>
              <Text style={st.subtitle}>Những lần app đã gợi ý món cho bạn</Text>
            </View>
            {/* Stats card */}
            <View style={st.statsCard}>
              <View style={st.statItem}>
                <Text style={st.statNum}>{sessions.length}</Text>
                <Text style={st.statLabel}>Lần gợi ý</Text>
              </View>
              <View style={st.statDivider} />
              <View style={st.statItem}>
                <Text style={[st.statNum, { color: '#4ADE80' }]}>{totalEaten}</Text>
                <Text style={st.statLabel}>Món đã ăn</Text>
              </View>
            </View>
            <Text style={st.sectionLabel}>THÁNG NÀY</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={st.empty}>
            <Text style={st.emptyIcon}>📋</Text>
            <Text style={st.emptyText}>Chưa có lịch sử nào</Text>
          </View>
        )}
      />
    </View>
  );
};

const st = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#FFFFF0' },
  header:       { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
                  borderBottomWidth: 2, borderBottomColor: '#E5E7EB', borderStyle: 'dashed' },
  title:        { fontSize: 32, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  subtitle:     { fontSize: 16, color: '#9CA3AF', marginTop: 4, fontFamily: 'Nunito' },
  statsCard:    { flexDirection: 'row', margin: 16, backgroundColor: '#FFFFFF', borderRadius: 24,
                  padding: 20, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  statItem:     { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 32, fontFamily: 'Patrick Hand', color: '#60A5FA', lineHeight: 38 },
  statLabel:    { fontSize: 14, color: '#9CA3AF', marginTop: 2, fontFamily: 'Nunito' },
  statDivider:  { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2,
                  textTransform: 'uppercase', marginHorizontal: 16, marginBottom: 8 },
  list:         { paddingBottom: 40 },
  card:         { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
                  marginHorizontal: 16, marginBottom: 12,
                  borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 4 },
  dateText:     { fontSize: 16, fontWeight: '700', color: '#1E1E1E', fontFamily: 'Nunito', flex: 1 },
  timeText:     { fontSize: 14, color: '#9CA3AF', fontFamily: 'Nunito' },
  locationText: { fontSize: 14, color: '#9CA3AF', marginBottom: 8, fontFamily: 'Nunito' },
  cardFooter:   { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip:         { backgroundColor: '#EFF6FF', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:     { fontSize: 13, color: '#60A5FA', fontWeight: '700', fontFamily: 'Nunito' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 18, color: '#9CA3AF', fontFamily: 'Nunito' },
});

export default HistoryScreen;
