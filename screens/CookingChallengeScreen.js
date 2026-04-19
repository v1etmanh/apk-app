import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { C, R, F, shadow } from '../theme';
import {
  saveChallengeHistory, markChallengeCompleted,
  getChallengeDateRecord, computeStreak,
} from '../utils/database';

const DIFFICULTY_LABEL = { easy:'🟢 Dễ', medium:'🟡 Vừa', hard:'🔴 Khó' };
const NATION_FLAG = { Vietnam:'🇻🇳', Japan:'🇯🇵', Korea:'🇰🇷', Thailand:'🇹🇭', Italy:'🇮🇹' };

export default function CookingChallengeScreen({ navigation }) {
  const { location } = useAppStore();
  const [loading, setLoading]     = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [streak, setStreak]       = useState(0);
  const [completed, setCompleted] = useState(false);
  const [todayKey, setTodayKey]   = useState('');

  useFocusEffect(useCallback(() => { loadChallenge(); }, [location]));

  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  };

  const loadChallenge = async () => {
    setLoading(true);
    try {
      const key = getTodayKey(); setTodayKey(key);
      const lat = location?.lat || 16.047, lon = location?.lon || 108.206;
      const res = await api.get(`/api/v1/challenge?lat=${lat}&lon=${lon}`);
      setChallenge(res.data.challenge_dish);
      const existing = await getChallengeDateRecord(key);
      if (!existing) {
        await saveChallengeHistory({ challenge_date:key, dish_id:res.data.challenge_dish.dish_id, dish_title:res.data.challenge_dish.title });
      } else { setCompleted(existing.completed === 1); }
      const s = await computeStreak(); setStreak(s);
    } catch (e) {
      console.error('[Challenge]', e);
      Alert.alert('Oops! 😅', 'Không thể tải thử thách. Kiểm tra kết nối nhé!');
    } finally { setLoading(false); }
  };

  const handleDone = async () => {
    if (completed) { navigation.navigate('DishDetail', { dish:challenge }); return; }
    await markChallengeCompleted(todayKey);
    setCompleted(true);
    const s = await computeStreak(); setStreak(s+1);
    Alert.alert('🎉 Tuyệt vời!',
      `Bạn đã hoàn thành thử thách hôm nay!${s>0 ? `\n🔥 Chuỗi ${s+1} ngày liên tiếp!` : ''}`,
      [{ text:'Yay!' }]);
  };

  if (loading) return (
    <View style={styles.center}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFF0" />
      <ActivityIndicator size="large" color="#60A5FA" />
      <Text style={styles.loadingText}>Đang chọn thử thách cho bạn... 🍳</Text>
    </View>
  );

  if (!challenge) return (
    <View style={styles.center}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFF0" />
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyText}>Chưa có thử thách hôm nay</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadChallenge}>
        <Text style={styles.retryText}>Thử lại 🔄</Text>
      </TouchableOpacity>
    </View>
  );

  const flag = NATION_FLAG[challenge.nation] || '🍴';
  const today = new Date();
  const dateLabel = `${today.toLocaleDateString('vi-VN', { weekday:'long' })}, ${today.getDate()}/${today.getMonth()+1}`;

  return (
    <View style={{ flex:1, backgroundColor:'#FFFFF0' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header — cố định ngoài ScrollView */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerBadge}>🏆 Thử thách hôm nay</Text>
          <Text style={styles.headerDate}>{dateLabel}</Text>
        </View>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:40 }}>
      {/* Hero Image */}
      <View style={styles.heroWrap}>
        {challenge.image_url
          ? <Image source={{ uri:challenge.image_url }} style={styles.heroImg} resizeMode="cover" />
          : <View style={styles.heroFallback}><Text style={styles.heroEmoji}>🍜</Text></View>
        }
        {completed && (
          <View style={styles.doneOverlay}>
            <Text style={styles.doneOverlayEmoji}>✅</Text>
            <Text style={styles.doneOverlayText}>Đã hoàn thành!</Text>
          </View>
        )}
      </View>

      {/* Dish Card */}
      <View style={styles.card}>
        <Text style={styles.dishTitle}>{challenge.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}><Text style={styles.metaChipText}>{flag} {challenge.nation || 'Việt Nam'}</Text></View>
          <View style={styles.metaChip}><Text style={styles.metaChipText}>⏱ {challenge.cook_time_min} phút</Text></View>
          <View style={styles.metaChip}><Text style={styles.metaChipText}>{DIFFICULTY_LABEL[challenge.difficulty] || '🟡 Vừa'}</Text></View>
        </View>
      </View>

      {/* Why today */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌟 Tại sao hôm nay?</Text>
        <Text style={styles.bodyText}>{challenge.why_today}</Text>
      </View>

      {/* Tips */}
      {challenge.tips?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Mẹo nhỏ</Text>
          {challenge.tips.map((tip, i) => (
            <Text key={i} style={styles.tipItem}>• {tip}</Text>
          ))}
        </View>
      )}

      {/* Streak */}
      {streak > 0 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>Chuỗi {streak} ngày liên tiếp!</Text>
        </View>
      )}

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.ctaBtnPrimary, completed && styles.ctaBtnDone]}
          onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.ctaBtnPrimaryText}>
            {completed ? '👀 Xem chi tiết' : '✅ Tôi đã nấu xong!'}
          </Text>
        </TouchableOpacity>
        {!completed && (
          <TouchableOpacity
            style={styles.ctaBtnGhost}
            onPress={() => navigation.navigate('DishDetail', { dish:challenge })}
            activeOpacity={0.85}>
            <Text style={styles.ctaBtnGhostText}>📖 Xem hướng dẫn đầy đủ</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ height:40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex:1, backgroundColor:'#FFFFF0' },
  center:           { flex:1, justifyContent:'center', alignItems:'center', padding:32, backgroundColor:'#FFFFF0' },
  loadingText:      { marginTop:14, color:'#9CA3AF', fontSize:16, fontFamily:'Nunito' },
  emptyIcon:        { fontSize:56, marginBottom:14 },
  emptyText:        { fontSize:20, fontFamily:'Patrick Hand', color:'#1E1E1E' },
  retryBtn:         { marginTop:20, backgroundColor:'#60A5FA', paddingHorizontal:28, paddingVertical:12,
                      borderRadius:9999,
                      shadowColor:'#60A5FA', shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:10, elevation:4 },
  retryText:        { color:'#fff', fontFamily:'Nunito', fontWeight:'700', fontSize:16 },

  header:           { flexDirection:'row', alignItems:'center', backgroundColor:'#FFFFFF', paddingTop:52,
                      paddingBottom:16, paddingHorizontal:16,
                      borderBottomWidth:2, borderBottomColor:'#E5E7EB', borderStyle:'dashed' },
  backBtn:          { width:44, height:44, justifyContent:'center', marginRight:8 },
  backText:         { fontSize:22, color:'#60A5FA', fontWeight:'600' },
  headerContent:    { flex:1 },
  headerBadge:      { fontSize:24, fontFamily:'Patrick Hand', color:'#1E1E1E' },
  headerDate:       { fontSize:14, fontFamily:'Nunito', color:'#9CA3AF', marginTop:2 },

  heroWrap:         { height:240, backgroundColor:'#E5E7EB', position:'relative' },
  heroImg:          { width:'100%', height:'100%' },
  heroFallback:     { width:'100%', height:'100%', justifyContent:'center', alignItems:'center', backgroundColor:'#EFF6FF' },
  heroEmoji:        { fontSize:80 },
  doneOverlay:      { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(74,222,128,0.7)',
                      justifyContent:'center', alignItems:'center' },
  doneOverlayEmoji: { fontSize:52, marginBottom:4 },
  doneOverlayText:  { fontSize:24, fontFamily:'Patrick Hand', color:'#fff' },

  card:             { margin:16, backgroundColor:'#FFFFFF', borderRadius:24, padding:18,
                      borderWidth:2, borderColor:'#E5E7EB', borderStyle:'dashed',
                      shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.08, shadowRadius:8, elevation:3 },
  dishTitle:        { fontSize:28, fontFamily:'Patrick Hand', color:'#1E1E1E', marginBottom:12 },
  metaRow:          { flexDirection:'row', flexWrap:'wrap', gap:8 },
  metaChip:         { backgroundColor:'#EFF6FF', paddingHorizontal:12, paddingVertical:5, borderRadius:9999,
                      borderWidth:1, borderColor:'#BFDBFE' },
  metaChipText:     { fontSize:14, fontFamily:'Nunito', color:'#3B82F6', fontWeight:'600' },

  section:          { marginHorizontal:16, marginBottom:12, backgroundColor:'#FFFFFF', borderRadius:24,
                      padding:16, borderWidth:2, borderColor:'#E5E7EB', borderStyle:'dashed',
                      shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  sectionTitle:     { fontSize:20, fontFamily:'Patrick Hand', color:'#1E1E1E', marginBottom:8 },
  bodyText:         { fontSize:16, fontFamily:'Nunito', color:'#6B7280', lineHeight:24 },
  tipItem:          { fontSize:16, fontFamily:'Nunito', color:'#6B7280', lineHeight:26 },

  streakBanner:     { marginHorizontal:16, marginBottom:12, backgroundColor:'#FEF9C3',
                      borderRadius:24, padding:16, flexDirection:'row', alignItems:'center', gap:10,
                      borderWidth:2, borderColor:'#FBBF24', borderStyle:'dashed' },
  streakEmoji:      { fontSize:28 },
  streakText:       { fontSize:20, fontFamily:'Patrick Hand', color:'#854D0E' },

  ctaWrap:          { marginHorizontal:16, gap:10 },
  ctaBtnPrimary:    { backgroundColor:'#60A5FA', borderRadius:16, paddingVertical:16, alignItems:'center',
                      shadowColor:'#60A5FA', shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:10, elevation:4 },
  ctaBtnDone:       { backgroundColor:'#4ADE80' },
  ctaBtnPrimaryText:{ color:'#fff', fontSize:18, fontFamily:'Nunito', fontWeight:'700' },
  ctaBtnGhost:      { borderRadius:16, paddingVertical:15, alignItems:'center',
                      borderWidth:2, borderColor:'#60A5FA', borderStyle:'dashed' },
  ctaBtnGhostText:  { color:'#60A5FA', fontSize:16, fontFamily:'Nunito', fontWeight:'700' },
});
