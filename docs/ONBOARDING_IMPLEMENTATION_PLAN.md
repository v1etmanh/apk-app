# Kế hoạch triển khai: Onboarding 5 màn + Bộ lọc mỗi lần Generate

- **Backend:** `D:\dream_project\daily_mate_code\demo_server` (Flask, nhánh `dev`, data JSON in-memory qua `data_store.py`)
- **Mobile:** `D:\dream_project\daily_mate_code\daily_mate_all\mobile_app` (Expo / RN, nhánh `dev`, Supabase)
- **Ngày lập:** 2026-11-15

---

## 0. Hiện trạng và các lỗ hổng phải sửa trước

| # | Vấn đề | Vị trí | Hậu quả |
|---|---|---|---|
| G1 | App gửi `taste_preference: []`; server chỉ hiểu list và cộng +0.3 | `HomeScreen.js` (`goSearch`), `pipeline.py` (`compute_personal_vector`) | `taste_profile` đã lưu trên Supabase không bao giờ tới được server |
| G2 | Lọc dị ứng lớp 1 so key tiếng Việt ("Hải sản") với tag tiếng Anh (`fish`, `shellfish`…) | `pipeline.py` (`filter_dishes`, khối `allergen_summary`) | Lớp 1 không bao giờ khớp |
| G3 | Tag trong `allergen_summary` không chuẩn: `Egg`/`egg`, `Fish`/`fish`, `crustacean`/`crustaceans`, `None` | `data/dishes.json` | Lọc sót nếu chỉ so khớp chính xác |
| G4 | Spec có "Cá", "Thịt bò", "Thịt heo" nhưng `ALLERGY_CATEGORY_MAP` chỉ có "Thịt" và "Hải sản" | `pipeline.py` | Không lọc được thịt bò/heo riêng |
| G5 | Lọc độ quen thuộc khóa cứng `familiarity_level == daily_comfort` và score ≥ 0.9 | `pipeline.py` (`filter_dishes`) | 353 món `regional_delicacy` không bao giờ được gợi ý |
| G6 | `taste_profile` của món là phân bố (tổng 0.3–2.0), không phải thang 0–1 | `dishes.json` | Phải chuẩn hóa trước khi tính `taste_weight` từ flashcard |
| G7 | Món like/dislike chưa có tác dụng khi chấm điểm | `score_dish` | Lựa chọn ở onboarding không ảnh hưởng gợi ý |
| G8 | App xin quyền GPS ngay sau splash, trước khi user vào onboarding | `App.js` (`initializeApp`) | Hộp thoại xin quyền hiện trước cả onboarding |
| G9 | Cổng onboarding đã bị tắt; các màn cũ trong `screens/onboarding/` còn đó nhưng không dùng | `App.js` | Phải bật lại cổng |

**Dữ liệu sẵn có để tận dụng:**
- Món ăn: `cuisine_region` (national 3798, southern 1417, northern 887, central 844, northwestern 51, highland 47), `familiarity_level`, `familiarity_score`, `is_vegan`, `is_vegetarian`, `image_url`, `taste_profile`, `cooking_method_id` (18 cách nấu), `cost_level` (1–3), `cook_time_minutes`.
- Nguyên liệu: `ingredients.json` có `allergen_tags`, `category`, `name`.

---

## 1. Hợp đồng dữ liệu

### 1.1 `onboarding_profile` (lưu ở mobile)

| Field | Nơi lưu |
|---|---|
| `gender`, `nation`, `home_region`, `diet_type`, `taste_weight`, `liked_dish_ids`, `disliked_dish_ids`, `onboarding_version: 1`, `onboarding_completed_at` | `app_profiles.data` (JSONB, qua `saveProfileMember`, không cần migration) |
| `height_cm`, `weight_kg` | `app_body_metrics` (qua `saveBodyMetricsForProfile`) |
| `allergies` (mỗi nhóm một dòng, `allergy_key` = key chuẩn ở mục 1.2) | `app_allergies` |

Field `taste_weight` cũng ghi đè luôn `taste_profile` (với `taste_mode: 'onboarding'`) để màn `TasteProfileScreen` cũ đọc được.

### 1.2 Key chuẩn cho nhóm dị ứng

Mobile gửi key tiếng Anh; server vẫn chấp nhận key tiếng Việt cũ làm alias.

| Key | Nhãn UI | Tag trong `allergen_summary` | Category nguyên liệu | Danh sách ID nguyên liệu |
|---|---|---|---|---|
| `seafood` | Hải sản | fish, shellfish, crustacean, mollusk | Hải sản | – |
| `fish` | Cá | fish | – | ID cá (tạo bằng script, review tay) |
| `beef` | Thịt bò | beef | – | ID thịt bò (bỏ "cá bò", "rau bò khai") |
| `pork` | Thịt heo | pork | – | ID thịt heo |
| `legume_nut` | Đậu & Hạt | nut, soy | Đậu & Hạt | – |
| `dairy_egg` | Sữa & Trứng | dairy, egg | Sữa & Trứng | – |
| `vegetable` | Rau củ | – | Rau củ | – |
| `gluten` | Gluten / lúa mì | gluten, wheat | – | – |

### 1.3 Request `/api/v1/recommend`: thêm field vào `personal` (tương thích ngược)

```json
"personal": {
  "...các field cũ...": "...",
  "taste_weight": {"spicy":0.82,"salty":0.76,"umami":0.7,"sour":0.55,"sweet":0.35,"bitter":0.2,"astringent":0.15},
  "home_region": "central",
  "nation": "vietnam",
  "liked_dish_ids": ["10581838"],
  "disliked_dish_ids": []
}
```

Thêm field mới ở cấp trên của body (dùng cho Giai đoạn 5):

```json
"meal_filters": {
  "cooking_tools": ["pot","pan"],
  "cost_level": 2,
  "cost_tolerance": 1,
  "max_cook_time": 30,
  "mode": "suggest"
}
```

`mode` nhận `"suggest"` hoặc `"fridge"`.

---

## 2. Giai đoạn 1: Backend nền (sửa G1–G7)

**File chính:** `pipeline.py`. Mỗi bước nên là một commit.

### B1. Chuẩn hóa dị ứng (G2, G3, G4)
- Thêm hàm `_norm_tag(t)`: chuyển chữ thường, strip, bỏ chữ "s" số nhiều (`crustaceans` → `crustacean`), bỏ qua `none`/`gluten_free`/`traces_of_gluten`.
- Thêm `ALLERGY_GROUPS: dict[key, {"tags": set, "categories": set, "ingredient_ids": set}]` theo bảng 1.2. Có alias từ key tiếng Việt cũ sang key mới.
- Thêm script `scripts/build_allergy_ingredient_ids.py`:
  - Quét `ingredients.json` theo tên (`bò`, `heo`/`lợn`, `cá`) và theo `allergen_tags`.
  - Xuất ra `data/allergy_ingredient_ids.json` để review tay, ví dụ loại "cá bò" khỏi nhóm beef.
  - Nạp file này trong `data_store.load_all()`.
- `resolve_allergy_ingredient_ids` dùng `ALLERGY_GROUPS` (categories + ingredient_ids + nguyên liệu có `allergen_tags` trùng tag).
- `filter_dishes`: so `{_norm_tag(t) for t in allergen_summary}` với hợp các `tags` của nhóm user chọn.
- Giữ `ALLERGY_CATEGORY_MAP` cũ làm alias để app bản cũ không hỏng.

### B2. Nhận `taste_weight` trực tiếp (G1)
- `compute_personal_vector`: nếu `p["taste_weight"]` là dict hợp lệ thì lấy 7 key, clamp về 0–1, thiếu key thì lấy `TASTE_DEFAULTS`. Đặt `has_taste_preference = True`.
- Truyền thêm `home_region`, `nation`, `liked_dish_ids`, `disliked_dish_ids` vào vector.

### B3. Chấm điểm vị bằng `taste_profile` đã chuẩn hóa (G6)
- Thêm hàm `_normalized_tp(dish)`: chia từng vị cho giá trị max của món; cache theo `dish_id`.
- `score_dish`: tính `taste_b = Σ w_k·tp̂_k / Σ w_k`. Giữ trọng số 15%, sẽ tinh chỉnh sau benchmark.

### B4. Mở khóa đặc sản theo vùng (G5)
- Thêm hằng số `HOME_REGION_CUISINE`:

  | `home_region` | `cuisine_region` được mở |
  |---|---|
  | `northern` | northern, northwestern |
  | `central` | central, highland |
  | `southern` | southern |
  | `national` | không mở thêm |

- Luật lọc mới (khi `familiarity_filter` là mặc định):
  - Cho qua nếu `familiarity_level == daily_comfort` **và** `familiarity_score ≥ min`, **hoặc**
  - Nếu `familiarity_level ∈ {regional_delicacy, popular_specialty}` **và** `cuisine_region ∈ HOME_REGION_CUISINE[home_region]`.
- Nếu không gửi `home_region` thì giữ nguyên hành vi cũ.
- `score_dish`: cộng thêm hệ số nhẹ `×1.05` cho món có `cuisine_region` trùng vùng của user.

### B5. Áp dụng like/dislike (G7)
- Món trong `liked_dish_ids`: nhân điểm `×1.10`.
- Món trong `disliked_dish_ids`: nhân `×0.6` (không loại hẳn để tránh pool rỗng).

### B6. Kiểm tra lại BMI
Logic BMI đã có trong `compute_demand` (`high_energy_need`, `low_calorie_need`), không cần đổi. Onboarding không hỏi tuổi nên giữ `age` mặc định 28; app có thể gửi thêm nếu sau này có.

---

## 3. Giai đoạn 2: Backend endpoint cho onboarding

Tạo module mới `onboarding.py` (logic thuần, dễ test) và đăng ký route trong `app.py`. Cả 2 endpoint đều dùng `@require_auth` và `@rate_limit(20/60s)`.

### E1. `POST /api/v1/onboarding/flashcards`

**Request:**
```json
{ "nation":"vietnam", "home_region":"central", "diet_type":"omnivore", "allergies":["dairy_egg"], "seed": 123 }
```

**Response:**
```json
{
  "cards": [
    { "dish_id":"...", "title":"...", "image_url":"...",
      "archetype":"salty", "label":"Mặn đậm",
      "taste_profile": { "...": "đã chuẩn hóa" } }
  ]
}
```
Trả về đúng 8 thẻ.

**Thuật toán:**
1. Lấy pool qua `filter_dishes` với profile tạm: `diet_type`, dị ứng, `nation`, `max_prep_time=999`, có `image_url`, không có `dish_type_filter`.
2. Tạo 7 archetype: `salty`, `sour`, `sweet`, `spicy`, `light`, `sweet_sour`, `bitter`.
   - Archetype đơn: vị đó trội nhất trong `tp̂` và giá trị ≥ 0.6.
   - `light`: tổng `tp̂` thấp và `sodium_per_serving` thấp.
   - `sweet_sour`: cả sweet và sour đều ≥ 0.6.
3. Thẻ thứ 8, `regional`: món `regional_delicacy` hoặc `popular_specialty` có `cuisine_region` thuộc vùng của user. Nếu vùng là `national` thì lấy `popular_specialty` có score cao nhất.
4. Trong mỗi archetype, sắp theo `familiarity_score` giảm dần, lấy top 15 rồi chọn ngẫu nhiên theo `seed`. Không cho trùng món.
5. Nếu archetype nào thiếu món (ví dụ vegan + `bitter`), lấy món phổ biến chưa dùng có vị đó cao nhất. Vẫn thiếu thì trả ít hơn 8 thẻ, kèm `"partial": true`.
6. Bản địa hóa `title` theo `language_from_request`, giống `dish_detail`.

### E2. `POST /api/v1/onboarding/taste-profile`

**Request:**
```json
{ "home_region":"central", "votes":[{"dish_id":"...","vote":"like|neutral|dislike"}] }
```

**Response:**
```json
{ "taste_weight":{}, "summary":[{"key":"salty","pct":80}], "liked_dish_ids":[], "disliked_dish_ids":[] }
```

**Công thức:**
- Trọng số vote: like = 1.0, neutral = 0.25, dislike = −0.6.
- `region` = `HOME_REGION_FLAVOR[home_region]`. Dùng lại các bộ số trong `REGION_FLAVOR_MAP` của mobile:
  - `northern` → red_river_delta
  - `central` → central_coast
  - `southern` → mekong_delta
  - `national` → urban_major
- `signal_k = Σ wᵢ·tp̂ᵢ[k] / Σ|wᵢ|`, thuộc khoảng [−0.6, 1].
- `pref_k = (signal_k + 0.6) / 1.6`, đưa về [0, 1].
- `taste_k = clamp(0.4·region_k + 0.6·pref_k, 0.05, 0.95)`, làm tròn 2 chữ số.
- Nếu không có vote nào hoặc tất cả là dislike thì `taste = region`.
- `summary`: các vị có `taste_k ≥ 0.3`, sắp giảm dần, đổi ra phần trăm.

Server tính để mobile và recommend dùng chung một công thức. Mobile giữ một bản JS của công thức làm fallback khi offline.

### E3. (tùy chọn) `GET /api/v1/onboarding/options`
Trả danh sách quốc gia, vùng miền, nhóm dị ứng (có nhãn vi/en), để thêm lựa chọn mà không cần phát hành lại app. Phiên bản 1 có thể hardcode ở mobile.

---

## 4. Giai đoạn 3: Hạ tầng phía mobile

| Việc | File |
|---|---|
| Service gọi E1, E2 và hàm `completeOnboarding(draft)` (ghi profile, body metrics, đồng bộ dị ứng, gán `onboarding_completed_at`) | `services/onboardingService.js` (mới) |
| Hàm `computeTasteWeightLocal` (bản JS của công thức E2) để chạy offline | `utils/tasteMath.js` (mới) |
| Store: thêm `onboardingDraft`, `setOnboardingField`, `resetOnboardingDraft` | `store/useAppStore.js` |
| Cổng onboarding: sau `loadProfile`, nếu `!profile.onboarding_completed_at && !isLegacyUser` thì render `OnboardingStack`; xong thì gọi `loadProfile` lại và vào Main | `App.js` |
| Dời đoạn xin quyền GPS và đăng ký push token: chỉ chạy trong `initializeApp` khi đã onboard; nếu chưa thì chạy ở Màn 5 (G8) | `App.js` |
| Payload gửi đi: thêm `taste_weight` (từ `profile.taste_weight ?? profile.taste_profile`), `home_region`, `nation`, liked/disliked; key dị ứng chuẩn | `screens/HomeScreen.js` (`goSearch`) |
| Màn dị ứng cũ dùng key chuẩn ở mục 1.2, kèm migrate key cũ khi load | `screens/AllergyScreen.js` |
| Chuỗi i18n: `onboarding.*` (vi, en) | `i18n/` |

**Định nghĩa `isLegacyUser`:** đã có `latestMetrics` hoặc `profile.taste_profile`. User cũ không bị chặn, chỉ thấy banner "Cập nhật khẩu vị (1 phút)" ở Home để mở Màn 4–5.

---

## 5. Giai đoạn 4: UI 5 màn

Thay thế toàn bộ `screens/onboarding/*` cũ. Stack gồm: `OnbBody` → `OnbRegion` → `OnbDiet` → `OnbTaste` → `OnbConfirm`.

**Component dùng chung (`components/onboarding/`):**
- `OnbLayout`: header, thanh tiến trình n/5, nút Back, nút CTA ở đáy.
- `RulerPicker`: FlatList ngang, `snapToInterval`, có vạch chia và rung nhẹ khi snap. Chiều cao 120–220 cm (mặc định 165); cân nặng 30–150 kg (mặc định 55, bước 0.5).
- `ChoiceCard`: thẻ chọn có emoji, dùng cho giới tính, vùng miền, chế độ ăn.
- `ChipGroup`: chọn nhiều, dùng cho dị ứng.
- `SwipeDeck`: dùng `Gesture.Pan` (gesture-handler 3) + reanimated 4.
  - Quẹt trái là dislike, phải là like, lên là bình thường; có 3 nút thay thế.
  - Có nút hoàn tác thẻ vừa quẹt.
  - Tải trước ảnh của thẻ kế tiếp.
- `TasteSummaryCard`: các thanh phần trăm vị; bản chỉnh sửa tái dùng `TasteSlider` từ `TasteProfileScreen`.

**Chi tiết từng màn:**

| Màn | Kiểm tra dữ liệu | Hành động khi bấm Tiếp |
|---|---|---|
| 1. Cơ thể | Bắt buộc chọn giới tính | Lưu vào draft; hiện BMI ngay để tham khảo |
| 2. Vùng miền | Nếu chọn Việt Nam thì bắt buộc chọn vùng; quốc gia khác dùng `home_region = national` | Lưu vào draft |
| 3. Chế độ ăn & dị ứng | Chọn "Không dị ứng" thì xóa hết chip; chọn một chip thì bỏ "Không dị ứng" | Lưu vào draft, gọi trước E1 để Màn 4 mở ra có thẻ ngay |
| 4. Flashcard | Hiện skeleton khi tải; lỗi mạng thì có nút thử lại hoặc nút "Bỏ qua" (lấy vị vùng miền) | Quẹt đủ 8 thẻ thì gọi E2; lỗi thì tính bằng `computeTasteWeightLocal` |
| 5. Xác nhận | – | Gọi `completeOnboarding`, xin quyền GPS rồi Notifications, vào Main |

**Lưu nháp giữa chừng:** Lưu `onboardingDraft` vào AsyncStorage (`onb_draft:<userId>`) để user thoát app giữa chừng thì quay lại đúng màn.

---

## 6. Giai đoạn 5: Bộ lọc mỗi lần Generate

### Backend (`pipeline.py`, `app.py`)
- `TOOL_METHODS`: map dụng cụ sang `cooking_method_id`.

  | Dụng cụ | Cách nấu |
  |---|---|
  | `pot` (Nồi) | luộc 1, kho 7, hầm 8, om 13, rim 14, nấu canh 15, khìa 18 |
  | `pan` (Chảo) | chiên ít dầu 4, xào 5, rang 9 |
  | `fryer_oven` (Nồi chiên / Nướng) | chiên ngập dầu 3, nướng 6, quay 17 |
  | `steamer` (Hấp) | hấp 2, hấp cách thủy 12 |
  | `no_cook` (Gỏi / không nấu) | trộn gỏi 10, ăn sống 11, muối chua 16 |

- `filter_dishes(meal_filters=...)`:
  - `cooking_tools` không rỗng thì giữ món có method thuộc hợp các tool đã chọn.
  - `max_cook_time` ghi đè `max_prep_time`.
- Chi phí có biên độ: giữ món có `|cost_level − target| ≤ tolerance`, cộng điểm cho món đúng target. Thay cách xử lý trong `compute_soft_mult` (dòng ~498).
- `mode = "fridge"`: dùng lại logic `market_basket` sẵn có, buộc `boost_strategy = strict`.
- Nếu pool rỗng thì nới dần ràng buộc: bỏ dụng cụ, rồi tăng tolerance, rồi tăng thời gian. Trả `relaxed_filters` để UI báo user.

### Mobile
- Ở `HomeScreen`, thêm bottom sheet "Bữa này": chip dụng cụ, segmented chọn chi phí + "± 1 mức", chip thời gian 15/30/45/60+.
- Ghi nhớ lựa chọn gần nhất (setting `last_meal_filters`).
- Chế độ "Tủ lạnh" chuyển sang luồng `MarketBasketScreen` sẵn có.

---

## 7. Kiểm thử

### Backend
Tạo `tests/test_onboarding.py` dùng `unittest` (không cần thêm dependency), chạy bằng `python -m unittest discover tests`.
- **Dị ứng:** chọn `seafood` thì không món nào có fish/shellfish/crustacean (kể cả viết hoa); chọn `beef` thì không món nào chứa ID thịt bò; key tiếng Việt cũ vẫn chạy.
- **Đặc sản:** `home_region = central` thì pool có món `regional_delicacy` central và không có món northern; `national` cho cùng pool như code cũ.
- **Flashcards:** đủ 8 thẻ, không trùng; người vegan chỉ nhận món vegan; có `seed` thì kết quả ổn định.
- **Taste-profile:** like toàn món cay thì `spicy` cao nhất; tất cả dislike thì bằng vị vùng miền; mọi giá trị nằm trong [0.05, 0.95].
- **Recommend:** có `taste_weight` thì thứ hạng thay đổi theo hướng đúng; không gửi field mới thì kết quả giống hệt bản cũ (snapshot top-10 với cố định seed/thời tiết).
- **Benchmark:** chạy lại `scripts/benchmark_comprehensive_suite.py` để so trước/sau.

### Mobile (thử tay trên thiết bị)
- User mới đi hết 5 màn; kiểm tra dữ liệu Supabase (`app_profiles`, `app_body_metrics`, `app_allergies`).
- Thoát app ở Màn 3, mở lại thì tiếp tục đúng chỗ.
- Mất mạng ở Màn 4 thì thử lại hoặc bỏ qua được; mất mạng ở Màn 5 thì dùng fallback local.
- User cũ không bị chặn và thấy banner.
- Recommend sau onboarding: payload có `taste_weight`, không còn món dính dị ứng.
- Từ chối quyền GPS thì vẫn vào được app.

---

## 8. Thứ tự làm, ước lượng và cách phát hành

| Bước | Nội dung | Ước lượng | Phụ thuộc |
|---|---|---|---|
| 1 | B1–B5 + test | 1.5 ngày | – |
| 2 | E1, E2 + test | 1 ngày | 1 |
| 3 | Deploy backend lên Railway (tương thích ngược nên app cũ không ảnh hưởng) | 0.25 ngày | 2 |
| 4 | Hạ tầng mobile (service, store, cổng, payload, key dị ứng) | 1 ngày | 2 (có thể làm song song với mock) |
| 5 | Component dùng chung + 5 màn + i18n | 2.5 ngày | 4 |
| 6 | Giai đoạn 5: bộ lọc generate (backend + UI) | 1.5 ngày | 1 |
| 7 | Thử end-to-end, sửa lỗi, build APK | 1 ngày | 5, 6 |

**Phát hành:**
- Backend luôn tương thích ngược: chỉ thêm field, alias key cũ.
- Mobile tăng version lên 1.0.8.
- Có cờ `onboarding_version` để sau này cho user làm lại khi đổi luồng.

## 9. Quyết định đã chốt mặc định (đổi được)
- Không hỏi tuổi, dùng mặc định 28.
- Quốc gia ngoài Việt Nam dùng `home_region = national`.
- User cũ không bị ép làm onboarding, chỉ thấy banner.
- `taste_weight` do server tính; mobile có bản fallback offline.
- Món dislike bị giảm điểm (×0.6), không loại hẳn.
