// components/onboarding/SwipeDeck.js
// Xấp thẻ món ăn: quẹt phải = Yêu thích, trái = Không thích, lên = Bình thường.
// Dùng PanResponder + Animated (RN core) — không cần GestureHandlerRootView.
import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, PanResponder, Dimensions, TouchableOpacity,
} from 'react-native';
import { C, R, F, shadow } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_X = 110;
const SWIPE_Y = 110;

const DishCard = ({ card, badge }) => (
  <View style={s.card}>
    <Image source={{ uri: card.image_url }} style={s.image} resizeMode="cover" />
    <View style={s.cardBody}>
      {!!card.label && <Text style={s.badge}>{badge ?? card.label}</Text>}
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

      <View style={s.buttons}>
        <VoteButton emoji="👈" label={labels.dislike} color={C.accentRed} onPress={() => fly('dislike')} disabled={!current} />
        <VoteButton emoji="⬆️" label={labels.neutral} color={C.amber} onPress={() => fly('neutral')} disabled={!current} />
        <VoteButton emoji="👉" label={labels.like} color={C.accentGreen} onPress={() => fly('like')} disabled={!current} />
      </View>
      {index > 0 && onUndo && (
        <TouchableOpacity onPress={onUndo} style={s.undo} hitSlop={8}>
          <Text style={s.undoText}>↶ {labels.undo}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const VoteButton = ({ emoji, label, color, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[s.voteBtn, { borderColor: color }, disabled && { opacity: 0.4 }]}
  >
    <Text style={s.voteEmoji}>{emoji}</Text>
    <Text style={[s.voteLabel, { color }]} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

const CARD_H = Math.min(420, SCREEN_H * 0.5);

const s = StyleSheet.create({
  root: { alignItems: 'center' },
  stack: { width: '100%', height: CARD_H, marginBottom: 18 },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    flex: 1, borderRadius: R.xl, backgroundColor: C.surface, overflow: 'hidden',
    borderWidth: 1, borderColor: C.borderLight, ...shadow(3),
  },
  image: { width: '100%', flex: 1, backgroundColor: C.parchmentDark },
  cardBody: { padding: 16 },
  badge: {
    alignSelf: 'flex-start', fontSize: F.xs, color: C.woodDark, backgroundColor: C.parchmentDark,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, overflow: 'hidden',
    fontFamily: 'BeVietnamPro-Bold', marginBottom: 6,
  },
  title: { fontSize: F.xl, color: C.text, fontFamily: 'Lora-Bold' },
  stamp: {
    position: 'absolute', top: 24, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 3, borderRadius: 10, fontSize: F.lg, fontFamily: 'BeVietnamPro-Bold',
    backgroundColor: 'rgba(255,255,255,0.85)', overflow: 'hidden',
  },
  stampLike: { left: 20, color: C.accentGreen, borderColor: C.accentGreen, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 20, color: C.accentRed, borderColor: C.accentRed, transform: [{ rotate: '12deg' }] },
  stampNeutral: { alignSelf: 'center', left: '30%', color: C.amber, borderColor: C.amber },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  voteBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.lg,
    borderWidth: 2, backgroundColor: C.surface,
  },
  voteEmoji: { fontSize: 22 },
  voteLabel: { fontSize: F.sm, fontFamily: 'BeVietnamPro-Bold', marginTop: 2 },
  undo: { marginTop: 12 },
  undoText: { color: C.textLight, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
});

export default SwipeDeck;
