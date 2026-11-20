// components/ui/IngredientThumb.js
// Ảnh nguyên liệu nhỏ, chỉ dùng ở chỗ người dùng CHỌN/NHẬN DIỆN nguyên liệu
// (card gợi ý, list chọn, nguyên liệu chính của món). Chip/tag thông tin giữ chữ.
// Lỗi tải / chưa có ảnh → emoji theo category, không làm vỡ layout.
import React, { memo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { C } from '../../theme';
import { getIngredientImageUrl, getIngredientById, getIngredientCategoryEmoji } from '../../utils/ingredientsData';

const IngredientThumb = ({ id, category, size = 44, variant, round = false, dimmed = false, style }) => {
  const [failed, setFailed] = useState(false);
  const v = variant || (size <= 40 ? 'icon' : 'thumb');
  const uri = failed ? null : getIngredientImageUrl(id, v);
  const cat = category || getIngredientById(Number(id))?.category;
  const radius = round ? size / 2 : Math.round(size * 0.28);

  return (
    <View style={[s.box, { width: size, height: size, borderRadius: radius }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, dimmed && { opacity: 0.55 }]}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.5) }}>{getIngredientCategoryEmoji(cat)}</Text>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  box: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
});

export default memo(IngredientThumb);
