# 🎨 Design System — Ghibli Handcrafted Style
> Phong cách: Studio Ghibli × Storybook Handcrafted  
> Áp dụng cho: React Native App (iOS + Android)  
> Phiên bản: 1.0.0

---

## 📐 Triết lý thiết kế

Mọi thứ trông như **được vẽ tay**, như thể bước ra từ cuốn sổ tay của một người nấu ăn lãng mạn. Không có gì quá sắc nét, quá cứng nhắc. Viền rung nhẹ, bóng đổ ấm áp, texture giấy và gỗ khắp nơi.

> *"Cảm giác như nhặt lên một cuốn sổ tay cũ đầy hình vẽ dễ thương"*

---

## 🎨 Màu sắc

### Palette chính

| Tên | Hex | Dùng cho |
|-----|-----|----------|
| **Parchment** | `#F5EDDC` | Background card chính |
| **Cream** | `#FFFFF0` | Background màn hình fallback |
| **Wood Dark** | `#8B5E3C` | Text tiêu đề, icon đậm |
| **Wood Mid** | `#C8A96E` | Viền card, accent |
| **Wood Light** | `#9A7040` | Viền chip/tag |
| **Ink Brown** | `#3D2B1F` | Text chính |
| **Ink Soft** | `#5C4A38` | Text phụ, body |
| **Ink Muted** | `#8B7355` | Date, placeholder |
| **Sky Blue** | `#60A5FA` | CTA primary (nút xanh dương) |
| **Done Green** | `#4ADE80` | Trạng thái hoàn thành |
| **Streak Yellow** | `#F59E0B` | Streak banner border |
| **Streak BG** | `#FEF3C7` | Streak badge background |

### Overlay & Texture Opacity

```
Wood background:     opacity 0.85
Paper cream overlay: rgba(240,230,210, 0.45)
Texture trên card:   opacity 0.55
Notebook lines:      opacity 0.12 – 0.15
```

---

## 🖋 Typography

### Font families

| Font | Dùng cho | Cảm giác |
|------|----------|----------|
| **Patrick Hand** | Tiêu đề, badge, CTA, section title | Viết tay, thân thiện |
| **Nunito** | Body text, chip label, date | Tròn trịa, dễ đọc |

### Scale

```
dishTitle:    26px  Patrick Hand  color: #3D2B1F
headerBadge:  22px  Patrick Hand  color: #4A3728
sectionTitle: 19px  Patrick Hand  color: #3D2B1F
streakText:   20px  Patrick Hand  color: #92400E
ctaPrimaryText: 18px Patrick Hand bold
bodyText:     15px  Nunito        color: #5C4A38  lineHeight: 23
chipText:     13px  Nunito bold   color: #3D2B1F
headerDate:   13px  Nunito        color: #8B7355
```

> ⚠️ **Không bao giờ dùng**: Inter, Roboto, System font — chúng phá vỡ hoàn toàn vibe Ghibli.

---

## 🖼 Texture Assets

```
assets/textures/
├── wood_light.png      → Background toàn màn hình (opacity 0.85)
├── paper_cream.png     → Card background, header background
├── sky_watercolor.png  → Loading/empty screen background
└── notebook_lines.png  → Overlay nhẹ trên hero image và why-section
```

### Cách dùng đúng

```jsx
{/* ✅ ĐÚNG — wrap Image trong View có overflow:hidden riêng */}
<View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
      pointerEvents="none">
  <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
</View>

{/* ❌ SAI — absoluteFill trực tiếp trong container chứa Text */}
{/* Gây clip text, đặc biệt tiếng Việt có dấu bị xoay dọc */}
<Image source={TEX.paper} style={StyleSheet.absoluteFill} resizeMode="cover" />
<Text>Văn bản bị lỗi</Text>
```

> 🚨 **Rule vàng**: Không bao giờ đặt `overflow: 'hidden'` trên container trực tiếp chứa `<Text>`. Luôn tách Image texture vào View wrapper riêng.

---

## 🃏 Components

### ParchmentCard

Card chính dùng để chứa nội dung. Nền giấy kem + viền nâu vàng + shadow nâu mềm.

```jsx
function ParchmentCard({ children, style, wrapperStyle }) {
  return (
    <View style={[parchmentShadow, wrapperStyle]}>
      <View style={[parchmentCard, style]}>
        {/* Texture wrapper riêng — KHÔNG để overflow:hidden trên card */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
              pointerEvents="none">
          <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <View style={{ zIndex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
```

**Style:**
```js
parchmentShadow: {
  borderRadius: 20,
  // iOS shadow
  shadowColor: '#8B5E3C',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  // Android
  elevation: 5,
},
parchmentCard: {
  borderRadius: 20,
  backgroundColor: '#F5EDDC',
  padding: 16,
  borderWidth: 1.5,
  borderColor: '#C8A96E',
  // KHÔNG có overflow: 'hidden' ở đây
},
```

---

### WigglyFrame

Khung SVG vẽ tay — viền hình chữ nhật rung nhẹ không hoàn hảo. Dùng bao quanh Dish Card.

```jsx
function WigglyFrame({ width, height, color = '#C8A96E', strokeWidth = 2, children, style }) {
  const w = width, h = height, s = 8;
  const path = `
    M ${s},${s * 0.6}
    Q ${w * 0.25},${-s * 0.3} ${w * 0.5},${s * 0.4}
    Q ${w * 0.75},${s * 1.1} ${w - s},${s * 0.7}
    Q ${w + s * 0.4},${h * 0.25} ${w - s * 0.6},${h * 0.5}
    Q ${w + s * 0.5},${h * 0.75} ${w - s},${h - s * 0.8}
    Q ${w * 0.75},${h + s * 0.4} ${w * 0.5},${h - s * 0.6}
    Q ${w * 0.25},${h + s * 0.3} ${s},${h - s * 0.7}
    Q ${-s * 0.4},${h * 0.75} ${s * 0.7},${h * 0.5}
    Q ${-s * 0.5},${h * 0.25} ${s},${s * 0.6}
    Z
  `;
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={path} fill="transparent" stroke={color} strokeWidth={strokeWidth} />
      </Svg>
      {children}
    </View>
  );
}
```

> Điều chỉnh `s` (= 8) để tăng/giảm mức độ "rung" của viền.

---

### WoodChip (Tag/Badge)

Tag metadata có nền texture gỗ.

```jsx
function WoodChip({ label }) {
  return (
    <View style={woodChip}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: 'hidden' }]}
            pointerEvents="none">
        <Image source={TEX.wood} style={{ width: '100%', height: '100%', opacity: 0.7 }}
               resizeMode="cover" />
      </View>
      <Text style={woodChipText}>{label}</Text>
    </View>
  );
}
```

**Style:**
```js
woodChip: {
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#9A7040',
},
woodChipText: {
  fontFamily: 'Nunito',
  fontWeight: '700',
  fontSize: 13,
  color: '#3D2B1F',
  zIndex: 1,
},
```

---

### MascotRow (Mèo mập)

Con mèo mập Lottie luôn hiện trên màn hình, kèm speech bubble giấy parchment. Text trong bubble thay đổi theo trạng thái màn hình.

```jsx
<View style={mascotRow}>
  <LottieView
    source={MEOMAP}
    autoPlay
    loop
    style={[mascotLottie, { pointerEvents: 'none' }]}
  />
  <View style={mascotBubbleWrap}>
    {/* KHÔNG dùng overflow:hidden ở đây */}
    <Text style={mascotBubbleText}>
      {loading ? 'Để tao chọn món cho mày... 🍳'
       : challenge ? `Hôm nay thử "${challenge.title}" đi nào! 😋`
       : 'Hổng có món hôm nay rồi... 😿'}
    </Text>
  </View>
</View>
```

**Style:**
```js
mascotRow: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  paddingHorizontal: 12,
  marginBottom: 4,
  marginTop: 4,
},
mascotLottie: {
  width: 80,
  height: 80,
  marginBottom: -6,   // nhô xuống dưới 1 chút cho sống động
  flexShrink: 0,
},
mascotBubbleWrap: {
  flex: 1,
  marginLeft: 8,
  marginBottom: 12,
  borderRadius: 16,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderWidth: 1.5,
  borderColor: '#C8A96E',
  backgroundColor: 'rgba(245,237,220,0.92)',
  // KHÔNG có overflow: 'hidden'
},
mascotBubbleText: {
  fontFamily: 'Patrick Hand',
  fontSize: 15,
  color: '#4A3728',
  lineHeight: 22,
  flexShrink: 1,
  flexWrap: 'wrap',
},
```

---

### Nút CTA Primary

Nút hành động chính — nền xanh dương + texture giấy mờ phủ lên.

```jsx
<View style={ctaPrimaryShadow}>
  <TouchableOpacity style={[ctaPrimary, completed && ctaDone]} onPress={handleDone}>
    <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}
          pointerEvents="none">
      <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.5 }}
             resizeMode="cover" />
    </View>
    <Text style={ctaPrimaryText}>{label}</Text>
  </TouchableOpacity>
</View>
```

```js
ctaPrimaryShadow: {
  borderRadius: 20,
  shadowColor: '#60A5FA',
  shadowOpacity: 0.3,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
},
ctaPrimary: {
  borderRadius: 20,
  paddingVertical: 17,
  alignItems: 'center',
  backgroundColor: '#60A5FA',
  borderWidth: 2,
  borderColor: '#3B82F6',
},
ctaDone: { backgroundColor: '#4ADE80', borderColor: '#22C55E' },
ctaPrimaryText: {
  color: '#fff',
  fontSize: 18,
  fontFamily: 'Patrick Hand',
  fontWeight: '700',
  zIndex: 1,
},
```

---

### Nút Ghost (Dashed Border)

Dùng SVG `<Rect strokeDasharray>` thay cho `borderStyle: 'dashed'` của RN (vì dashed RN trông cứng).

```jsx
<TouchableOpacity style={ctaGhost}>
  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Rect x="2" y="2" width="96%" height="92%"
      rx="18" ry="18"
      fill="transparent"
      stroke="#C8A96E"
      strokeWidth="2"
      strokeDasharray="6 3"
    />
  </Svg>
  <Text style={ctaGhostText}>📖 Xem hướng dẫn đầy đủ</Text>
</TouchableOpacity>
```

```js
ctaGhost: {
  borderRadius: 20,
  paddingVertical: 16,
  alignItems: 'center',
  backgroundColor: 'rgba(245,237,220,0.6)',
  minHeight: 54,
  // KHÔNG overflow:hidden
},
```

---

## 🌑 Shadow System

Thay vì dùng thư viện ngoài, dùng helper function thuần RN:

```js
const nativeShadow = (
  color = '#8B5E3C',
  opacity = 0.22,
  radius = 8,
  offset = { width: 0, height: 4 },
  elevation = 6
) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: offset,
    },
    android: { elevation },
  });
```

### Preset shadows

| Dùng cho | color | opacity | radius | elevation |
|----------|-------|---------|--------|-----------|
| ParchmentCard | `#8B5E3C` | 0.18 | 8 | 5 |
| Hero image | `#8B5E3C` | 0.28 | 10 | 8 |
| Streak banner | `#F59E0B` | 0.20 | 7 | 4 |
| CTA primary | `#60A5FA` | 0.30 | 8 | 6 |
| Mascot bubble | `#8B5E3C` | 0.15 | 6 | 3 |

> ⚠️ Bóng đổ chỉ hoạt động trên iOS nếu View **không** có `overflow: 'hidden'`.  
> Trên Android, `elevation` hoạt động độc lập.

---

## 📋 Background Layout

Mọi màn hình đều xây theo kiểu **layered**:

```
Layer 1 (bottom): wood_light.png — absoluteFill, opacity 0.85
Layer 2:          rgba(240,230,210,0.45) overlay — làm mềm màu gỗ
Layer 3:          Header với paper_cream.png background
Layer 4 (top):    ScrollView content với các ParchmentCard
```

```jsx
<View style={{ flex: 1 }}>
  {/* Layer 1 — gỗ */}
  <Image source={TEX.wood} style={[StyleSheet.absoluteFillObject, { opacity: 0.85 }]}
         resizeMode="cover" />
  {/* Layer 2 — overlay kem */}
  <View style={[StyleSheet.absoluteFillObject,
                { backgroundColor: 'rgba(240,230,210,0.45)' }]} />
  {/* Layer 3+ — nội dung */}
  ...
</View>
```

---

## ⚙️ Dependencies

```bash
# Bắt buộc
npm install react-native-svg
npm install lottie-react-native

# KHÔNG cần (đã thay bằng native)
# react-native-shadow-2  ← bỏ, dùng nativeShadow() helper
# expo-linear-gradient   ← optional, không bắt buộc
```

### Assets checklist

```
assets/
├── textures/
│   ├── wood_light.png        ✅
│   ├── paper_cream.png       ✅
│   ├── sky_watercolor.png    ✅
│   └── notebook_lines.png    ✅
└── animations/
    └── meo_ma.json           ✅  (Lottie mèo mập)
```

---

## 🚨 Những lỗi hay gặp

### 1. Text bị xoay dọc / bị clip

**Nguyên nhân:** `overflow: 'hidden'` trên container cha trực tiếp của `<Text>`  
**Fix:** Bỏ `overflow: 'hidden'` khỏi container Text. Dùng wrapper View riêng cho Image texture.

### 2. Shadow không hiện trên iOS

**Nguyên nhân:** View có `overflow: 'hidden'` sẽ clip shadow  
**Fix:** Tách shadow ra `*ShadowWrap` View bên ngoài, View bên trong mới có `overflow: 'hidden'`

### 3. LottieView warning `pointerEvents deprecated`

**Fix:**
```jsx
// ❌ Cũ
<LottieView pointerEvents="none" ... />

// ✅ Mới
<LottieView style={[styles.lottie, { pointerEvents: 'none' }]} ... />
```

### 4. `borderStyle: 'dashed'` trông cứng, không Ghibli

**Fix:** Dùng SVG `<Rect strokeDasharray="6 3">` thay thế.

### 5. Text tiếng Việt bị cut ký tự có dấu

**Nguyên nhân:** Container quá hẹp hoặc `overflow: 'hidden'` clip baseline  
**Fix:** Thêm `flexWrap: 'wrap'`, `flexShrink: 1` cho Text, bỏ overflow khỏi container.

---

## 🎯 Checklist khi tạo màn hình mới

- [ ] Background: wood texture + cream overlay
- [ ] Header: paper texture trong wrapper `overflow:hidden` riêng
- [ ] Cards: dùng `ParchmentCard` với `nativeShadow`
- [ ] Không có `overflow:hidden` trên container chứa `<Text>`
- [ ] Font: Patrick Hand cho tiêu đề, Nunito cho body
- [ ] Dashed border: dùng SVG thay `borderStyle:'dashed'`
- [ ] Shadow: dùng `nativeShadow()` helper, không cài thêm thư viện
- [ ] Mascot mèo: hiện thường trực, text bubble thay đổi theo context

---

*Last updated: April 2026 — Dream Project v1.0*