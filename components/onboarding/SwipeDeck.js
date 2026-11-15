// components/onboarding/SwipeDeck.js
// Xấp thẻ món ăn: quẹt phải = Yêu thích, trái = Không thích, lên = Bình thường.
// Dùng PanResponder + Animated (RN core) — không cần GestureHandlerRootView.
import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity,
} from 'react-native';
import { C, R, F, shadow } from '../../theme';
import { MascotCat } from '../ui/Mascot';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_X = 110;
const SWIPE_Y = 110;

// Thẻ món như tấm ảnh dán sổ; nhãn khẩu vị (archetype) là con tem nghiêng ở góc ảnh.
const DishCard = ({ card, badge }) => (
  <View style={s.card}>
    <View style={s.imageWrap}>
      <Image source={{ uri: card.image_url }} style={s.image} resizeMode="cover" />
      {!!card.label && <Text style={s.badge}>{badge ?? card.label}</Text>}
    </View>
    <View style={s.cardBody}>
      <Text style={s.title} numberOfLines={2}>{card.title}</Text>
    </View>
  </View>
);

const SwipeDeck = ({ cards, index, onVote, onUndo, labels }) => {
  const pos = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const stateRef = useRef({ cards, index, onVote });
  stateRef.current = { cards, index, onVote };

  const current = cards[index];
  const next = cards[index + 1];

  useEffect(() => {
    const after = cards[index + 2];
    if (after?.image_url) Image.prefetch(after.image_url).catch(() => {});
  }, [cards, index]);

  const fly = (vote) => {
    if (busy.current) return;
    const { cards: cs, index: i, onVote: cb } = stateRef.current;
    const card = cs[i];
    if (!card) return;
    busy.current = true;
    const toValue = vote === 'like'
      ? { x: SCREEN_W * 1.4, y: 0 }
      : vote === 'dislike'
        ? { x: -SCREEN_W * 1.4, y: 0 }
        : { x: 0, y: -SCREEN_H };
    Animated.timing(pos, { toValue, duration: 220, useNativeDriver: false }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      busy.current = false;
      cb(card, vote);
    });
  };
  const flyRef = useRef(fly);
  flyRef.current = fly;

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_X) flyRef.current('like');
      else if (g.dx < -SWIPE_X) flyRef.current('dislike');
      else if (g.dy < -SWIPE_Y) flyRef.current('neutral');
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  }), [pos]);

  const rotate = pos.x.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOpacity = pos.x.interpolate({ inputRange: [20, SWIPE_X], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pos.x.interpolate({ inputRange: [-SWIPE_X, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const neutralOpacity = pos.y.interpolate({ inputRange: [-SWIPE_Y, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });

  return (
    <View style={s.root}>
      <View style={s.stack}>
        {/* Thẻ giấy lót phía sau cho cảm giác xấp thẻ */}
        <View style={[s.layer, s.backSheet, { transform: [{ rotate: '3deg' }] }]} />
        {next && (
          <Animated.View style={[s.layer, { transform: [{ scale: nextScale }] }]}>
            <DishCard card={next} />
          </Animated.View>
        )}
        {current ? (
          <Animated.View
            {...responder.panHandlers}
            style={[s.layer, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
          >
            <DishCard card={current} />
            <Animated.Text style={[s.stamp, s.stampLike, { opacity: likeOpacity }]}>{labels.like}</Animated.Text>
            <Animated.Text style={[s.stamp, s.stampNope, { opacity: nopeOpacity }]}>{labels.dislike}</Animated.Text>
            <Animated.Text style={[s.stamp, s.stampNeutral, { opacity: neutralOpacity }]}>{labels.neutral}</Animated.Text>
          </Animated.View>
        ) : null}
      </View>
      {/* Mèo ngồi trên đỉnh xấp thẻ — slot `deck` (80×80) */}
      <MascotCat slot="deck" size={80} style={s.deckCat} />

      <View style={s.buttons}>
        <VoteButton emoji="👎" label={`← ${labels.dislike}`} color="#B4532A" textColor="#8E3B1B" onPress={() => fly('dislike')} disabled={!current} />
        <VoteButton emoji="😐" label={`↑ ${labels.neutral}`} color={C.textLight} textColor={C.textMid} onPress={() => fly('neutral')} disabled={!current} small />
        <VoteButton emoji="😋" label={`${labels.like} →`} color={C.inkGreen} textColor={C.freshText} onPress={() => fly('like')} disabled={!current} />
      </View>
      {index > 0 && onUndo && (
        <TouchableOpacity onPress={onUndo} style={s.undo} hitSlop={8}>
          <Text style={s.undoText}>↶ {labels.undo}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const VoteButton = ({ emoji, label, color, textColor, onPress, disabled, small }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[s.voteBtn, disabled && { opacity: 0.4 }]}
  >
    <View style={[s.voteCircle, small && s.voteCircleSmall, { borderColor: color }]}>
      <Text style={[s.voteEmoji, small && { fontSize: 22 }]}>{emoji}</Text>
    </View>
    <Text style={[s.voteLabel, { color: textColor || color }]} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

const CARD_H = Math.min(400, SCREEN_H * 0.46);

const s = StyleSheet.create({
  root: { alignItems: 'center', paddingTop: 44 },
  stack: { width: '100%', height: CARD_H, marginBottom: 18 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backSheet: { left: 10, right: 10, top: 8, borderRadius: 22, backgroundColor: C.parchmentDark, borderWidth: 1.5, borderColor: C.border },
  deckCat: { position: 'absolute', top: 0, left: '50%', marginLeft: -40, zIndex: 5, elevation: 12 },
  card: {
    flex: 1, borderRadius: 22, backgroundColor: C.parchmentLight, padding: 12,
    borderWidth: 1.5, borderColor: C.paperStroke, ...shadow(3),
  },
  imageWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: C.parchmentDark },
  image: { width: '100%', height: '100%' },
  cardBody: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 2 },
  badge: {
    position: 'absolute', top: 10, right: 10, transform: [{ rotate: '4deg' }],
    fontSize: F.sm, color: C.woodDark, backgroundColor: C.parchmentLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary,
    fontFamily: 'BeVietnamPro-Bold',
  },
  title: { fontSize: F.xl, color: C.text, fontFamily: 'Lora-Bold' },
  stamp: {
    position: 'absolute', top: 30, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 3, borderRadius: 10, fontSize: F.lg, fontFamily: 'BeVietnamPro-Bold',
    backgroundColor: 'rgba(255,248,234,0.92)', overflow: 'hidden',
  },
  stampLike: { left: 24, color: C.inkGreen, borderColor: C.inkGreen, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 24, color: '#B4532A', borderColor: '#B4532A', transform: [{ rotate: '12deg' }] },
  stampNeutral: { alignSelf: 'center', left: '30%', color: C.textMid, borderColor: C.textLight },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 18, width: '100%' },
  voteBtn: { alignItems: 'center', gap: 4, minWidth: 88 },
  voteCircle: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2, backgroundColor: C.parchmentLight,
    alignItems: 'center', justifyContent: 'center', ...shadow(1),
  },
  voteCircleSmall: { width: 50, height: 50, borderRadius: 25 },
  voteEmoji: { fontSize: 26 },
  voteLabel: { fontSize: 12, fontFamily: 'BeVietnamPro-Bold' },
  undo: { marginTop: 10, minHeight: 40, justifyContent: 'center' },
  undoText: { color: C.woodDark, fontSize: F.sm, fontFamily: 'BeVietnamPro-Bold' },
});

export default SwipeDeck;
