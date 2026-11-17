// components/ui/Mascot.js
// Linh vật mèo dùng chung cho mọi màn.
//
// Mỗi vị trí đặt mèo có một tên (slot). Hiện tại các slot vẽ khung placeholder;
// khi có animation, chỉ cần điền file Lottie vào MASCOT_SOURCES — không phải sửa màn nào.
//
//   slot            kích thước   vị trí                                       Lottie gợi ý
//   suggest         72×72        IngredientSuggest — trái bóng thoại          cat_orange.json
//   basket          88×88        MarketBasket — ngồi trên mép thẻ "Đã chọn"   Lazy cat.json
//   loading         180×180      Màn chờ đề xuất — giữa màn                   Cute cat works.json
//   result          64×64        Recommend — hàng bóng thoại trên thẻ đầu     Cattr.json
//   oops            88×88        Recommend — thẻ cảnh báo giỏ ít món          cat_gosh.json
//   end             96×96        Recommend — cuối danh sách                   Lazy cat.json
//   detail          72×72        DishDetail — góc khối "Vì sao hợp"           cat.json
//   onboarding      88×88        Onboarding bước 1–3 — trái bóng thoại        Dance cat.json ✔
//   sheet           64×64        Sheet phạm vi dị ứng — trên mép sheet        cat_gosh.json ✔
//   deck            80×80        Thẻ khẩu vị — trên đỉnh bộ thẻ               cat_orange.json ✔
//   celebrate       140×140      Khẩu vị của bạn — trên tiêu đề               Cat Pookie.json ✔
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { C } from '../../theme';

// Điền require('../../assets/animations/<file>.json') để bật Lottie cho slot đó.
export const MASCOT_SOURCES = {
  suggest:    null,
  basket:     null,
  loading:    null,
  result:     null,
  oops:       null,
  end:        null,
  detail:     null,
  onboarding: require('../../assets/animations/Dance cat.json'),
  sheet:      require('../../assets/animations/cat_gosh.json'),
  deck:       require('../../assets/animations/cat_orange.json'),
  celebrate:  require('../../assets/animations/Cat Pookie.json'),
};

export const MascotCat = ({ slot, size = 72, style }) => {
  const source = MASCOT_SOURCES[slot];
  if (source) {
    return (
      <LottieView
        source={source}
        autoPlay
        loop
        style={[{ width: size, height: size, pointerEvents: 'none' }, style]}
      />
    );
  }
  return (
    <View
      style={[s.placeholder, { width: size, height: size, borderRadius: Math.round(size * 0.24) }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Text style={{ fontSize: Math.round(size * 0.42) }}>🐱</Text>
      {__DEV__ && size >= 64 && <Text style={s.label}>{`${size}×${size}`}</Text>}
    </View>
  );
};

/** Hàng "mèo + bóng thoại" — câu phụ đề của màn được mèo nói ra. */
export const MascotSays = ({ slot, size = 72, text, children, style, align = 'flex-end' }) => (
  <View style={[s.row, { alignItems: align }, style]}>
    <MascotCat slot={slot} size={size} />
    <View style={s.bubbleCol}>
      <View style={s.bubble}>
        <Text style={s.bubbleText}>{text}</Text>
      </View>
      {children}
    </View>
  </View>
);

const s = StyleSheet.create({
  placeholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C8803A',
    backgroundColor: 'rgba(255,240,214,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, color: '#7A4A12', fontFamily: 'BeVietnamPro-Bold', marginTop: 1 },
  row: { flexDirection: 'row', gap: 10 },
  bubbleCol: { flex: 1, gap: 6, marginBottom: 4 },
  bubble: {
    backgroundColor: C.parchmentLight,
    borderWidth: 1.5,
    borderColor: C.paperStroke,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleText: {
    fontFamily: 'Patrick Hand',
    fontSize: 15,
    lineHeight: 21,
    color: '#4A3728',
    flexShrink: 1,
  },
});
