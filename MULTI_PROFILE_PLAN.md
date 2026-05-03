# 🧑‍👨‍👩‍👦 Kế hoạch: Multi-Profile Feature
> Phiên bản: 1.0 | Tác giả: AI Plan | Ngày: 2026

---

## 1. PHÂN TÍCH HIỆN TRẠNG

### Cách đang hoạt động
- Mỗi thiết bị có 1 `deviceId` (random string, lưu AsyncStorage)
- Mọi data đều scope theo `deviceId`: `profiles/{deviceId}`, `allergies/{deviceId}/...`
- `useAppStore` chứa 1 `profile` object duy nhất
- `loadProfile()` / `saveProfile()` hard-code theo `deviceId`

### Vấn đề cần giải quyết
- Thêm nhiều profile (bản thân, con, cha mẹ...) trên cùng 1 thiết bị
- Switch profile → toàn bộ recommendation, allergy, metrics thay đổi theo
- Profile mặc định (active) phải được nhớ giữa các lần mở app
- Không phá vỡ data của người dùng hiện tại (migration)
- toi da 1 ng co the co 5 profiles
---

## 2. THIẾT KẾ DATA MODEL MỚI

### 2.1 Firestore Schema

```
# Trước (hiện tại):
profiles/{deviceId}                          ← 1 profile duy nhất
allergies/{deviceId}/items/{key}
body_metrics/{deviceId}/entries/{id}

# Sau (multi-profile):
device_profiles/{deviceId}/                  ← metadata thiết bị
  └─ members/{profileId}/                   ← mỗi member là 1 profile
       ├─ profile_info                      ← (doc) tên, tuổi, giới tính...
       ├─ allergies/{key}                   ← sub-collection
       └─ body_metrics/{id}                 ← sub-collection

settings/{deviceId}/kv/{key}                 ← giữ nguyên (device-level)
sessions/{deviceId}/records/{sessionId}      ← thêm field profileId
```

### 2.2 ProfileMember entity

```js
{
  profileId:    "string (auto UUID)",     // PK
  displayName:  "Bản thân",              // Tên hiển thị
  relation:     "self",                  // self | child | parent | spouse | other
  avatar:       "🧑",                   // Emoji hoặc null
  isDefault:    true,                    // Profile mặc định (active khi mở app)
  created_at:   "ISO string",
  // Personal info (giống PersonalInput hiện tại):
  gender:         "male",
  birth_year:     1995,
  dietary_goal:   "maintenance",
  diet_type:      "omnivore",
  activity_level: "moderately_active",
  health_condition: [],
  taste_preference: [],
}
```

### 2.3 activeProfileId

```
AsyncStorage key: "active_profile_id"
→ Đọc khi app start → set vào store → dùng xuyên suốt session
```

---

## 3. THAY ĐỔI DATABASE (utils/database.js)

### Hàm mới cần thêm

```js
// ── Profile Members ───────────────────────────────────────
getActiveProfileId()           // đọc AsyncStorage "active_profile_id"
setActiveProfileId(profileId)  // ghi AsyncStorage

loadAllProfiles()              // list tất cả members của deviceId
loadProfileById(profileId)     // load 1 profile cụ thể
saveProfileMember(data)        // tạo mới hoặc update profile
deleteProfileMember(profileId) // xóa profile (không được xóa nếu còn 1 profile)

// ── Scoped functions (thêm profileId param) ───────────────
loadAllergiesForProfile(profileId)
addAllergyForProfile(profileId, key, name)
removeAllergyForProfile(profileId, key)

loadLatestMetricsForProfile(profileId)
saveBodyMetricsForProfile(profileId, data)

// ── Migration helper ──────────────────────────────────────
migrateExistingProfile()
// → đọc profiles/{deviceId} (schema cũ)
// → tạo device_profiles/{deviceId}/members/default_profile
// → set activeProfileId = "default_profile"
// → xóa profiles/{deviceId} cũ (optional, có thể giữ backup)
```

### Giữ nguyên (backward compat)

```js
// Các hàm cũ delegate sang profile active
loadProfile()   → loadProfileById(activeProfileId)
saveProfile()   → saveProfileMember({ profileId: activeProfileId, ...data })
loadAllergies() → loadAllergiesForProfile(activeProfileId)
```

---

## 4. THAY ĐỔI STORE (store/useAppStore.js)

```js
// Thêm state
profiles:        [],      // Array<ProfileMember> — danh sách tất cả
activeProfileId: null,    // string | null

// Thêm actions
setProfiles:         (list)      => set({ profiles: list }),
setActiveProfileId:  (id)        => set({ activeProfileId: id }),

// Thêm thunk
switchProfile: async (profileId) => {
  await setActiveProfileId(profileId);         // ghi AsyncStorage
  set({ activeProfileId: profileId });
  // reload data cho profile mới
  await get().loadProfile();
  await get().loadLatestMetrics();
  await get().loadAllergies();
},

loadAllProfiles: async () => {
  const profiles = await loadAllProfiles();
  set({ profiles });
  return profiles;
},

// Sửa initializeSettings — thêm load activeProfileId
initializeSettings: async () => {
  // ... code hiện tại ...
  const activeProfileId = await getActiveProfileId();
  set({ activeProfileId });
  // ...
}
```

---

## 5. CÁC MÀN HÌNH CẦN TẠO / SỬA

### 5.1 🆕 ProfileSwitcherSheet.js (new)
**Bottom sheet chọn profile — gọi từ Header**

```
┌─────────────────────────────┐
│  👤 Chọn thành viên         │
├─────────────────────────────┤
│  ✅ 🧑 Bản thân   (active)  │
│     👦 Con trai             │
│     👴 Ba                   │
├─────────────────────────────┤
│  ➕ Thêm thành viên         │
└─────────────────────────────┘
```

- Dùng Modal hoặc `@gorhom/bottom-sheet`
- Tap vào profile → gọi `switchProfile(id)`
- Hiển thị active profile với checkmark + highlight

### 5.2 🆕 AddEditProfileScreen.js (new)
**Form tạo / chỉnh sửa profile**

Fields:
- displayName (text input)
- relation (picker: Bản thân / Con / Cha / Mẹ / Vợ/Chồng / Khác)
- avatar (emoji picker: 🧑 👦 👧 👴 👵 👨 👩)
- gender, birth_year, dietary_goal, diet_type, activity_level
- health_condition (multi-select)

Navigation: `ProfileScreen` → button "Thêm thành viên" → `AddEditProfileScreen`

### 5.3 ✏️ ProfileScreen.js (sửa)
**Thêm section quản lý profiles**

```
SECTION "Thành viên gia đình"
┌──────────────────────────────┐
│ 🧑 Bản thân         ✅ Active│
│ 👦 Con trai                  │  ← tap → switch
│ [+ Thêm thành viên]          │
└──────────────────────────────┘
```

- Tap profile khác → switch + reload
- Long press → Edit / Delete options
- Active profile được highlight màu Wood

### 5.4 ✏️ HomeScreen.js (sửa nhỏ)
**Header hiển thị active profile + nút switch**

```
┌─────────────────────────────┐
│ 🧑 Bản thân  ▾  (tap → switch sheet)
└─────────────────────────────┘
```

### 5.5 ✏️ EditPersonalScreen.js (sửa)
**Scope edit theo activeProfileId, không edit toàn bộ**

### 5.6 ✏️ AllergyScreen.js + BodyMetricsScreen.js (sửa nhỏ)
**Truyền profileId xuống hàm DB thay vì dùng deviceId trực tiếp**

---

## 6. LỘ TRÌNH THỰC HIỆN (Theo phase)

### ✅ Phase 0 — Chuẩn bị (1-2 giờ)
- [ ] Đọc toàn bộ code hiện tại (đã làm ✅)
- [ ] Tạo file này (MULTI_PROFILE_PLAN.md)
- [ ] Không đụng đến production code

---

### 🔷 Phase 1 — Database layer (2-3 giờ)
**File: `utils/database.js`**

1. Thêm helper functions:
   - `getActiveProfileId()` / `setActiveProfileId(id)`
   - `profileMembersCol(deviceId)` / `profileMemberRef(deviceId, profileId)`
   - `loadAllProfiles()` — list tất cả members
   - `loadProfileById(profileId)`
   - `saveProfileMember(data)` — upsert
   - `deleteProfileMember(profileId)`

2. Thêm scoped allergy / metrics:
   - `loadAllergiesForProfile(profileId)`
   - `addAllergyForProfile(profileId, key, name)`
   - `removeAllergyForProfile(profileId, key)`
   - `loadLatestMetricsForProfile(profileId)`
   - `saveBodyMetricsForProfile(profileId, data)`

3. Migration:
   - `migrateExistingProfile()` — đọc schema cũ, tạo "Bản thân" profile

4. Backward compat:
   - `loadProfile()` → `loadProfileById(await getActiveProfileId())`
   - `saveProfile(data)` → `saveProfileMember({...})`
   - `loadAllergies()` → `loadAllergiesForProfile(await getActiveProfileId())`

**Test: Chạy migration, kiểm tra Firestore console xem data đúng chưa**

---

### 🔷 Phase 2 — Store layer (1 giờ)
**File: `store/useAppStore.js`**

1. Thêm `profiles: []`, `activeProfileId: null`
2. Thêm `setProfiles`, `setActiveProfileId`
3. Thêm `loadAllProfiles()` thunk
4. Thêm `switchProfile(id)` thunk — đây là hàm quan trọng nhất
5. Sửa `initializeSettings` — load `activeProfileId` từ AsyncStorage

---

### 🔷 Phase 3 — UI: ProfileSwitcherSheet (2 giờ)
**File mới: `components/ProfileSwitcherSheet.js`**

- Modal bottom sheet style Ghibli (parchment background)
- List profiles với avatar emoji + tên
- Active profile có checkmark
- Nút "+ Thêm thành viên" navigate đến AddEditProfileScreen
- Đóng sheet sau khi switch

---

### 🔷 Phase 4 — UI: AddEditProfileScreen (2-3 giờ)
**File mới: `screens/AddEditProfileScreen.js`**

- Form đầy đủ theo Ghibli design
- Nếu `route.params.profileId` có → edit mode
- Nếu không → create mode
- Validate: displayName không được rỗng
- Sau save → navigate back, reload profiles list

---

### 🔷 Phase 5 — Tích hợp vào ProfileScreen (1 giờ)
**File sửa: `screens/ProfileScreen.js`**

- Thêm section "Thành viên" ở đầu màn hình
- List profiles horizontal hoặc vertical
- Tap → switch, long press → edit/delete
- Nút thêm mới

---

### 🔷 Phase 6 — Header Home (30 phút)
**File sửa: `screens/HomeScreen.js`**

- Thêm profile name + avatar nhỏ vào header
- Tap → mở ProfileSwitcherSheet

---

### 🔷 Phase 7 — Scope data screens (1 giờ)
- `AllergyScreen.js` — dùng `loadAllergiesForProfile` / `addAllergyForProfile`
- `BodyMetricsScreen.js` — dùng `loadLatestMetricsForProfile`
- `EditPersonalScreen.js` — save vào đúng profileId

---

### 🔷 Phase 8 — Test & Polish (1-2 giờ)
- [ ] Tạo 3 profiles, switch qua lại
- [ ] Kiểm tra allergy của profile A không hiện ở profile B
- [ ] Kiểm tra metrics độc lập
- [ ] Kiểm tra migration profile cũ → "Bản thân"
- [ ] Test offline (AsyncStorage fallback)
- [ ] Kiểm tra không có profile nào bị xóa nhầm

---

## 7. LUỒNG USER (UX Flow)

```
Lần đầu dùng app (đã có profile cũ):
  App start → migrateExistingProfile() → tạo "Bản thân" → set active
  → Mọi thứ hoạt động như cũ ✅

Thêm profile mới:
  ProfileScreen → "Thêm thành viên"
  → AddEditProfileScreen (form)
  → Save → profiles list cập nhật

Switch profile:
  Tap tên profile ở HomeScreen header  (hoặc từ ProfileScreen)
  → ProfileSwitcherSheet mở ra
  → Tap "Con trai"
  → switchProfile("abc123")
    → setActiveProfileId AsyncStorage
    → reload profile, allergies, metrics
    → Sheet đóng
  → Toàn bộ app dùng data của "Con trai"

Xóa profile:
  ProfileScreen → long press profile → "Xóa"
  → Guard: không xóa nếu chỉ còn 1 profile
  → Guard: nếu xóa active profile → auto switch sang profile đầu tiên còn lại
```

---

## 8. DESIGN NOTES (Ghibli Style)

### ProfileSwitcherSheet
```
- Background: parchment (#F5EDDC) + paper texture
- Border: #C8A96E, borderRadius 24 (top)
- Active row: backgroundColor rgba(200,169,110,0.15) + WoodChip badge "Đang dùng"
- Avatar: Text emoji size 28, trong View tròn border #C8A96E
- Add button: Ghost button với SVG dashed border
```

### Profile Avatar Options
```
🧑 Bản thân   👦 Con trai   👧 Con gái
👴 Ba          👵 Mẹ         👨 Chồng
👩 Vợ          🧒 Trẻ nhỏ   👤 Khác
```

### Relation Labels (tiếng Việt)
```
self     → Bản thân
child    → Con
parent   → Cha/Mẹ
spouse   → Vợ/Chồng
sibling  → Anh/Chị/Em
other    → Khác
```

---

## 9. RỦI RO & CÁCH XỬ LÝ

| Rủi ro | Xử lý |
|--------|-------|
| Migration fail (profile cũ không có) | `migrateExistingProfile` catch error → tạo profile trống "Bản thân" |
| activeProfileId bị mất (clear AsyncStorage) | Fallback: load profile đầu tiên trong list, set làm active |
| Xóa profile đang active | Auto switch + toast "Đã chuyển sang [tên profile khác]" |
| Firestore offline | Dùng Firestore offline persistence (đã có cache) |
| Chỉ còn 1 profile | Ẩn nút xóa / disable |
| displayName rỗng | Validate trước khi save, hiện lỗi inline |

---

## 10. FILES SẼ THAY ĐỔI

| File | Loại | Mô tả |
|------|------|-------|
| `utils/database.js` | Sửa | Thêm multi-profile functions, backward compat |
| `store/useAppStore.js` | Sửa | Thêm profiles state, switchProfile action |
| `screens/ProfileScreen.js` | Sửa | Thêm section quản lý members |
| `screens/HomeScreen.js` | Sửa nhỏ | Header hiển thị active profile |
| `screens/AllergyScreen.js` | Sửa nhỏ | Scope theo activeProfileId |
| `screens/BodyMetricsScreen.js` | Sửa nhỏ | Scope theo activeProfileId |
| `screens/EditPersonalScreen.js` | Sửa nhỏ | Save đúng profileId |
| `screens/AddEditProfileScreen.js` | **Tạo mới** | Form add/edit profile |
| `components/ProfileSwitcherSheet.js` | **Tạo mới** | Bottom sheet chọn profile |
| `App.js` | Sửa nhỏ | Thêm AddEditProfileScreen vào Stack |

---

*Kế hoạch này được tạo sau khi đọc toàn bộ codebase. Bắt đầu từ Phase 1.*
