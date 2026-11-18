// components/WhyThisDish.js
// Khối "Vì sao chọn món này" ở màn Chi tiết món.
// Mọi thứ hiển thị đều lấy từ `why` (server dựng từ sổ cái điểm của đúng lần gợi ý đó):
//   kết luận → điểm đến từ đâu (tỉ lệ thật) → từng lý do kèm bằng chứng → điều cần cân nhắc → độ hợp từng mặt.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { C } from '../theme';
import PaperCard from './ui/PaperCard';
import SectionHeader from './ui/SectionHeader';
import { MascotCat } from './ui/Mascot';
import {
  hasWhy, whyHeadline, reasonView, tradeoffView, WHY_GROUPS, WHY_GROUP_STYLE,
} from '../utils/whyText';

const pct = (v) => Math.round(Math.max(0, Math.min(1, v || 0)) * 100);

const useGrow = (delay = 0) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, useNativeDriver: false }).start();
  }, [v, delay]);
  return v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
};

// ── Thanh "điểm đến từ đâu": một thanh xếp chồng theo tỉ lệ đóng góp thật ──────
const ShareBar = ({ share, t }) => {
  const width = useGrow(150);
  const groups = WHY_GROUPS.filter(g => (share?.[g] || 0) > 0);
  if (!groups.length) return null;
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{t('why.sourceTitle')}</Text>
      <View style={s.shareTrack}>
        <Animated.View style={[s.shareFill, { width }]}>
          {groups.map(g => (
            <View key={g} style={{ flex: share[g], backgroundColor: WHY_GROUP_STYLE[g].color }} />
          ))}
        </Animated.View>
      </View>
      <View style={s.legend}>
        {groups.map(g => (
          <View key={g} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: WHY_GROUP_STYLE[g].color }]} />
            <Text style={s.legendText}>
              {t(`why.group.${g}`)} <Text style={s.legendPct}>{pct(share[g])}%</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Một lý do: icon + câu + chip bằng chứng ───────────────────────────────────
const ReasonRow = ({ view }) => (
  <View style={s.reasonRow}>
    <View style={[s.reasonIcon, { backgroundColor: view.color + '1F' }]}>
      <Ionicons name={view.icon} size={16} color={view.color} />
    </View>
    <View style={s.reasonBody}>
      <Text style={s.reasonTitle}>{view.title}</Text>
      {view.chips.length > 0 && (
        <View style={s.chips}>
          {view.chips.map((c, i) => (
            <View key={i} style={[s.chip, { borderColor: view.color + '55' }]}>
              <Text style={[s.chipText, { color: view.color }]}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
);

// ── Độ hợp từng mặt (giá trị RIÊNG của món, khác nhau giữa các món) ────────────
const FitBar = ({ group, value, t, delay }) => {
  const width = useGrow(delay);
  const { color, icon } = WHY_GROUP_STYLE[group];
  return (
    <View style={s.fitRow}>
      <Ionicons name={icon} size={14} color={color} style={{ width: 18 }} />
      <Text style={s.fitLabel} numberOfLines={1}>{t(`why.group.${group}`)}</Text>
      <View style={s.fitTrack}>
        <Animated.View style={{ width, height: '100%' }}>
          <View style={[s.fitFill, { width: `${pct(value)}%`, backgroundColor: color }]} />
        </Animated.View>
      </View>
      <Text style={[s.fitVal, { color }]}>{pct(value)}%</Text>
    </View>
  );
};

export default function WhyThisDish({ why, explanation, showHeader = true }) {
  const { t, i18n } = useTranslation();

  // Món lưu từ trước khi có `why` (Bữa hôm nay / Lịch sử cũ): chỉ còn câu ngắn
  if (!hasWhy(why)) {
    const legacy = explanation && !Array.isArray(explanation) ? explanation.headline : (explanation?.[0] || '');
    if (!legacy) return null;
    return (
      <View style={s.section}>
        {showHeader && <SectionHeader title={t('why.title')} icon="sparkles-outline" />}
        <PaperCard innerStyle={{ padding: 16, gap: 8 }}>
          <Text style={s.headline}>{legacy}</Text>
          <Text style={s.muted}>{t('why.oldData')}</Text>
        </PaperCard>
      </View>
    );
  }

  const reasons = why.reasons.map(r => reasonView(r, t));
  const tradeoffs = (why.tradeoffs || []).map(tr => tradeoffView(tr, t, i18n)).filter(x => x.text);
  const fitGroups = WHY_GROUPS.filter(g => why.fit?.[g] != null);
  const rank = why.rank || {};

  return (
    <View style={s.section}>
      {showHeader && <SectionHeader title={t('why.title')} icon="sparkles-outline" />}
      <View style={s.wrap}>
        <MascotCat slot="detail" size={72} style={s.cat} />
        <PaperCard priority="primary" innerStyle={{ padding: 18, paddingTop: 22 }}>
          {/* Kết luận */}
          <View style={s.headBanner}>
            <Ionicons name="sparkles" size={16} color={C.amber} style={{ marginTop: 2 }} />
            <Text style={s.headline}>{whyHeadline(why, t)}</Text>
          </View>
          {!!rank.pos && (
            <View style={s.rankRow}>
              <View style={s.rankPill}>
                <Text style={s.rankText}>{t('why.rank', { pos: rank.pos, pct: rank.match_pct })}</Text>
              </View>
              {rank.lifted_for_variety && (
                <View style={s.liftedRow}>
                  <Ionicons name="shuffle-outline" size={13} color={C.textSoft} />
                  <Text style={s.liftedText}>{t('why.lifted')}</Text>
                </View>
              )}
            </View>
          )}

          <ShareBar share={why.share} t={t} />

          {reasons.length > 0 && (
            <View style={s.block}>
              {reasons.map(v => <ReasonRow key={v.key} view={v} />)}
            </View>
          )}

          {tradeoffs.length > 0 && (
            <View style={[s.block, s.tradeBox]}>
              <Text style={[s.blockTitle, { color: C.seasonText }]}>{t('why.tradeoffTitle')}</Text>
              {tradeoffs.map(v => (
                <View key={v.key} style={s.tradeRow}>
                  <Ionicons name={v.icon} size={15} color={C.seasonText} style={{ marginTop: 1 }} />
                  <Text style={s.tradeText}>{v.text}</Text>
                </View>
              ))}
            </View>
          )}

          {fitGroups.length > 0 && (
            <View style={[s.block, { marginBottom: 0 }]}>
              <Text style={s.blockTitle}>{t('why.fitTitle')}</Text>
              {fitGroups.map((g, i) => (
                <FitBar key={g} group={g} value={why.fit[g]} t={t} delay={250 + i * 90} />
              ))}
            </View>
          )}
        </PaperCard>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 24 },
  wrap: { marginTop: 30 },
  cat: { position: 'absolute', right: 14, top: -40, zIndex: 2, elevation: 10 },

  headBanner: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.10)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.30)',
  },
  headline: { flex: 1, fontFamily: 'Lora-Bold', fontSize: 16.5, lineHeight: 23, color: C.text },
  muted: { fontFamily: 'BeVietnamPro-Regular', fontSize: 13, lineHeight: 19, color: C.textSoft },

  rankRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 },
  rankPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.chipBg },
  rankText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12.5, color: C.woodDark },
  liftedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liftedText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: C.textSoft },

  block: { marginTop: 16 },
  blockTitle: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase',
    color: C.textSoft, marginBottom: 8,
  },

  shareTrack: { height: 14, borderRadius: 7, backgroundColor: C.parchmentDark, overflow: 'hidden' },
  shareFill: { height: '100%', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: C.textMid },
  legendPct: { fontFamily: 'BeVietnamPro-Bold', color: C.text },

  reasonRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  reasonIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reasonBody: { flex: 1 },
  reasonTitle: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 14, lineHeight: 20, color: C.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  chipText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11.5 },

  tradeBox: { padding: 12, borderRadius: 14, backgroundColor: C.seasonBg },
  tradeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tradeText: { flex: 1, fontFamily: 'BeVietnamPro-Regular', fontSize: 13, lineHeight: 19, color: C.seasonText },

  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  fitLabel: { width: 118, fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: C.textMid },
  fitTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.parchmentDark, overflow: 'hidden' },
  fitFill: { height: '100%', borderRadius: 4 },
  fitVal: { width: 38, textAlign: 'right', fontFamily: 'BeVietnamPro-Bold', fontSize: 12.5 },
});
