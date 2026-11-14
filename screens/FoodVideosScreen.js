import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Linking, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { C, F, R, shadow } from '../theme';
import { getIngredientVideos } from '../services/ingredientVideoService';
import { YOUTUBE_EMBED_REFERRER, toYouTubeEmbedHtml } from '../utils/foodVideos';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(148, Math.max(132, SCREEN_WIDTH * 0.36));
const CATEGORY_EMOJI = { vegetables: '🥬', fruits: '🍊', meat: '🥩', seafood: '🐟', seasoning: '🧂', other: '🍽️' };

const FoodVideosScreen = () => {
  const { t, i18n } = useTranslation();
  const isFocused = useIsFocused();
  const language = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const [videos, setVideos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const records = await getIngredientVideos(language);
      setVideos(records);
      setSelectedId((current) => records.some((item) => item.id === current) ? current : records[0]?.id || null);
    } catch (requestError) {
      setError(true);
      if (__DEV__) console.warn('[Ingredient videos] Failed to load', requestError?.message || requestError);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (isFocused) loadVideos();
  }, [isFocused, loadVideos]);

  const selectedVideo = videos.find((video) => video.id === selectedId) || videos[0];
  const categories = useMemo(() => ['all', ...new Set(videos.map((video) => video.category))], [videos]);
  const filteredVideos = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return videos.filter((video) => {
      const categoryMatch = activeCategory === 'all' || video.category === activeCategory;
      const text = (video.title + ' ' + video.description).toLocaleLowerCase();
      return categoryMatch && (!search || text.includes(search));
    });
  }, [activeCategory, query, videos]);

  const openVideo = (video) => {
    if (!video?.videoUrl) return;
    Linking.openURL(video.videoUrl);
  };

  const categoryLabel = (category) => category === 'all'
    ? t('videos.categories.all')
    : t('videos.categories.' + category, { defaultValue: t('videos.categories.other') });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DAILY MATE · {t('videos.kitchen')}</Text>
            <Text style={styles.title}>{t('videos.exploreTitle')}</Text>
            <Text style={styles.subtitle}>{t('videos.exploreSubtitle')}</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>🧑‍🍳</Text></View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('videos.searchPlaceholder')}
            placeholderTextColor={C.textLight}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? <TouchableOpacity onPress={() => setQuery('')}><Text style={styles.clearText}>×</Text></TouchableOpacity> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((category) => (
            <TouchableOpacity key={category} style={[styles.chip, activeCategory === category && styles.chipActive]} onPress={() => setActiveCategory(category)} activeOpacity={0.8}>
              <Text style={[styles.chipText, activeCategory === category && styles.chipTextActive]}>
                {category === 'all' ? '' : (CATEGORY_EMOJI[category] || '🍽️') + ' '}{categoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.stateCard}><Text style={styles.stateEmoji}>🍳</Text><Text style={styles.stateText}>{t('videos.loading')}</Text></View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateEmoji}>📡</Text>
            <Text style={styles.stateText}>{t('videos.loadError')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadVideos}><Text style={styles.retryText}>{t('common.retry')}</Text></TouchableOpacity>
          </View>
        ) : !videos.length ? (
          <View style={styles.stateCard}><Text style={styles.stateEmoji}>🎬</Text><Text style={styles.stateText}>{t('videos.empty')}</Text></View>
        ) : selectedVideo ? (
          <View style={styles.featureCard}>
            <View style={styles.videoWrap}>
              {isFocused ? (
                <WebView
                  source={{
                    html: toYouTubeEmbedHtml(selectedVideo.videoId),
                    baseUrl: YOUTUBE_EMBED_REFERRER,
                  }}
                  style={styles.featureVideo}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  setSupportMultipleWindows={false}
                  originWhitelist={['*']}
                />
              ) : (
                <Image source={{ uri: selectedVideo.thumbnailUrl }} style={styles.featureVideo} resizeMode="cover" />
              )}
              <View pointerEvents="none" style={styles.videoBadge}><Text style={styles.videoBadgeText}>▶ YouTube</Text></View>
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureKicker}>{t('videos.featured')}</Text>
              <Text style={styles.featureTitle}>{selectedVideo.title}</Text>
              {selectedVideo.description ? <Text style={styles.featureDescription}>{selectedVideo.description}</Text> : null}
              <View style={styles.featureMeta}>
                <Text style={styles.oneVideo}>{t('videos.oneVideo')}</Text>
                <TouchableOpacity onPress={() => openVideo(selectedVideo)}><Text style={styles.openText}>{t('videos.watchOnYoutube')} ›</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('videos.library')}</Text>
          <Text style={styles.seeAll}>{t('videos.viewAll')} ›</Text>
        </View>
        {filteredVideos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.library}>
            {filteredVideos.map((video) => {
              const selected = video.id === selectedVideo?.id;
              return (
                <TouchableOpacity key={video.id} style={[styles.ingredientCard, { width: CARD_WIDTH }, selected && styles.ingredientCardSelected]} onPress={() => setSelectedId(video.id)} activeOpacity={0.82}>
                  <View style={[styles.ingredientThumb, selected && styles.ingredientThumbSelected]}>
                    <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
                    <View style={styles.miniPlay}><Text style={styles.miniPlayText}>▶</Text></View>
                  </View>
                  <Text style={styles.ingredientName} numberOfLines={1}>{video.title}</Text>
                  <Text style={styles.ingredientMeta}>{t('videos.oneVideo')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : !loading && !error && videos.length ? (
          <View style={styles.emptyState}><Text style={styles.emptyEmoji}>🔎</Text><Text style={styles.emptyText}>{t('videos.noResults')}</Text></View>
        ) : null}
        <View style={styles.note}><Text style={styles.noteIcon}>▶️</Text><Text style={styles.noteText}>{t('videos.publicNote')}</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerCopy: { flex: 1 },
  eyebrow: { color: C.accentGreen, fontSize: F.xs, fontWeight: '800', letterSpacing: 1.4, marginBottom: 5 },
  title: { color: C.text, fontFamily: 'Lora_700Bold', fontSize: 27, lineHeight: 31 },
  subtitle: { color: C.textLight, fontSize: F.sm, marginTop: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCEBDC', borderWidth: 2, borderColor: '#C8A97E' },
  avatarText: { fontSize: 25 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.parchmentLight, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, marginBottom: 13 },
  searchIcon: { color: C.accentGreen, fontSize: 24, lineHeight: 27, marginRight: 6 },
  searchInput: { flex: 1, color: C.text, fontSize: F.sm, paddingVertical: 11 },
  clearText: { color: C.textLight, fontSize: 24, paddingLeft: 8 },
  chips: { gap: 8, paddingBottom: 15 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, backgroundColor: 'rgba(255,250,240,0.72)', paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { borderColor: C.accentGreen, backgroundColor: C.accentGreen },
  chipText: { color: C.textLight, fontSize: F.xs, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  featureCard: { backgroundColor: C.text, borderRadius: 20, overflow: 'hidden', marginBottom: 20, ...shadow(2) },
  videoWrap: { position: 'relative' },
  featureVideo: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#221B17' },
  playButton: { position: 'absolute', left: '50%', top: '50%', width: 58, height: 58, marginLeft: -29, marginTop: -29, borderRadius: 29, backgroundColor: 'rgba(210,54,42,0.94)', alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#FFFFFF', fontSize: 24, marginLeft: 3 },
  videoBadge: { position: 'absolute', right: 11, top: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.58)' },
  videoBadgeText: { color: '#FFFFFF', fontSize: F.xs, fontWeight: '800' },
  featureCopy: { padding: 13, paddingBottom: 14 },
  featureKicker: { color: '#B6D8BD', fontSize: F.xs, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  featureTitle: { color: C.parchmentLight, fontFamily: 'Lora_700Bold', fontSize: 21 },
  featureDescription: { color: '#DFD3C7', fontSize: F.sm, lineHeight: 19, marginTop: 5 },
  featureMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  oneVideo: { color: '#B6D8BD', fontSize: F.xs, fontWeight: '700' },
  openText: { color: '#F3C27D', fontSize: F.xs, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: C.text, fontFamily: 'Lora_700Bold', fontSize: 19 },
  seeAll: { color: C.accentGreen, fontSize: F.xs, fontWeight: '800' },
  library: { gap: 10, paddingBottom: 18 },
  ingredientCard: { backgroundColor: C.parchmentLight, borderWidth: 1, borderColor: C.border, borderRadius: 15, overflow: 'hidden' },
  ingredientCardSelected: { borderColor: C.accentGreen, borderWidth: 2 },
  ingredientThumb: { height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFEBC8', position: 'relative' },
  ingredientThumbSelected: { backgroundColor: '#CFE5D2' },
  thumbnail: { width: '100%', height: '100%' },
  miniPlay: { position: 'absolute', right: 7, bottom: 7, width: 23, height: 23, borderRadius: 12, backgroundColor: '#D2362A', alignItems: 'center', justifyContent: 'center' },
  miniPlayText: { color: '#FFFFFF', fontSize: 9, marginLeft: 1 },
  ingredientName: { color: C.text, fontSize: F.sm, fontWeight: '800', paddingHorizontal: 10, paddingTop: 9 },
  ingredientMeta: { color: C.textLight, fontSize: F.xs, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  stateCard: { alignItems: 'center', justifyContent: 'center', minHeight: 170, backgroundColor: C.parchmentLight, borderRadius: R.lg, marginBottom: 20, padding: 20 },
  stateEmoji: { fontSize: 32, marginBottom: 10 },
  stateText: { color: C.textMid, fontSize: F.sm, textAlign: 'center' },
  retryButton: { marginTop: 12, backgroundColor: C.accentGreen, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontSize: F.sm, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', minHeight: 130, backgroundColor: C.parchmentLight, borderRadius: R.lg },
  emptyEmoji: { fontSize: 30, marginBottom: 8 },
  emptyText: { color: C.textMid, fontSize: F.sm },
  note: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBEDEC', borderRadius: R.md, padding: 12, marginTop: 3 },
  noteIcon: { fontSize: 18, marginRight: 8 },
  noteText: { flex: 1, color: '#7A514D', fontSize: F.xs, lineHeight: 17 },
});

export default FoodVideosScreen;
