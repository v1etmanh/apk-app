# 📋 IMPLEMENT: Giới hạn lịch sử tối đa 20 request gần nhất

> Tài liệu này mô tả đầy đủ cơ chế, vị trí cần thay đổi, và code cần thêm  
> Cập nhật: May 2026 | Tác giả: AI Agent

---

## 1. Phân tích hiện trạng

### Vấn đề
Mỗi lần user nhấn "Tìm món", `RecommendScreen.js` gọi `persistSession()` → ghi 1 session mới vào Firestore. **Không có giới hạn** → sessions tích lũy vô hạn.

### Luồng ghi hiện tại (tracing từ code)
```
User nhấn "Tìm món" (HomeScreen)
  → navigate('Recommend', { searchParams })
    → RecommendScreen.fetchRecommendations()
      → api.post('/api/v1/recommend', ...)
        → persistSession(result, params)          ← ĐÂY LÀ NƠI SINH SESSION
          → saveSession(...)                      → Firestore: sessions/{deviceId}/records/{autoId}
          → saveDishesToSession(sid, dishes)      → Firestore: sessions/{deviceId}/records/{sid}/dishes/{autoId}
```

### Nơi đọc lịch sử
```
HistoryScreen.loadHistory()
  → loadSessions(20)    ← đã limit=20 khi HIỂN THỊ, nhưng Firestore vẫn lưu vô hạn
```

### Kết luận
- Firestore đang chứa **tất cả sessions từ trước đến nay**, không bị xóa
- `loadSessions(20)` chỉ giới hạn khi **đọc** — không giúp gì cho việc lưu trữ
- Cần thêm cơ chế **prune** (cắt bớt) phía sau mỗi lần ghi session mới

---

## 2. Phương án được chọn: Prune-After-Write (Fire & Forget)

### So sánh các phương án

| Phương án | Mô tả | Ưu | Nhược |
|-----------|-------|-----|-------|
| **A — Prune after write** ✅ | Ghi session mới xong → background prune | Không block UI, đơn giản | Tồn tại thoáng qua 21 session |
| B — Check before write | Đọc count → xóa cũ → ghi mới (tuần tự) | Không bao giờ vượt 20 | Chậm hơn, thêm 1 round-trip Firestore |
| C — Firestore Transaction | Atomic read-delete-write | Chặt chẽ nhất | Phức tạp; transaction không hỗ trợ sub-collection delete |

**Chọn phương án A** vì:
- UX không bị ảnh hưởng (prune chạy ngầm sau khi kết quả đã hiển thị)
- Tồn tại thoáng qua 21 session là chấp nhận được (chỉ vài ms)
- Code đơn giản, dễ maintain, ít rủi ro crash luồng chính

---

## 3. Các file cần thay đổi

| File | Loại thay đổi | Mô tả |
|------|--------------|-------|
| `utils/database.js` | **Thêm function** | `pruneOldSessions(maxCount)` |
| `screens/RecommendScreen.js` | **Sửa function** | Gọi `pruneOldSessions` trong `persistSession` |

> **Không cần đụng** vào: `HistoryScreen.js`, `database.js` (phần loadSessions), hay bất kỳ store/service nào khác.

---

## 4. Chi tiết thay đổi

---

### 4.1 `utils/database.js` — Thêm hàm `pruneOldSessions`

**Vị trí:** Thêm vào ngay sau hàm `clearAllHistory()` (khoảng dòng 390)

**Import cần có:** `deleteDoc` — đã có sẵn ở đầu file, không cần thêm.

```javascript
// ─── PRUNE OLD SESSIONS — giữ tối đa maxCount session gần nhất ───────────────
/**
 * Xóa các session cũ vượt quá giới hạn maxCount.
 * Mỗi session bị xóa sẽ kéo theo toàn bộ dishes sub-collection của nó.
 *
 * Chiến lược: Fire-and-forget từ persistSession — không throw, không block UI.
 * Gọi sau khi saveSession() thành công để tránh race condition xóa session vừa tạo.
 *
 * @param {number} maxCount - Số session tối đa được giữ lại (default: 20)
 */
export async function pruneOldSessions(maxCount = 20) {
  try {
    const id = await getDeviceId();

    // Đọc TẤT CẢ sessions, sort newest first
    // Không dùng limit() ở đây vì cần biết tổng số để quyết định có prune không
    const q = query(sessionsCol(id), orderBy('created_at', 'desc'));
    const snap = await withTimeoutFallback(getDocs(q), 8000, null);

    if (!snap || snap.size <= maxCount) return; // Chưa vượt ngưỡng → không làm gì

    // Những session cần xóa = tất cả từ index maxCount trở đi (cũ nhất)
    const toDelete = snap.docs.slice(maxCount);

    if (__DEV__) {
      console.log(`[DB] pruneOldSessions: total=${snap.size}, keeping=${maxCount}, deleting=${toDelete.length}`);
    }

    // Fetch dishes sub-collection của mỗi session cần xóa — song song
    const dishSnaps = await Promise.all(
      toDelete.map(sessionDoc =>
        withTimeoutFallback(getDocs(dishesCol(id, sessionDoc.id)), 5000, null)
      )
    );

    // Gom tất cả deleteDoc vào 1 mảng rồi Promise.all
    const deletes = [];
    toDelete.forEach((sessionDoc, idx) => {
      // Xóa dishes trước
      if (dishSnaps[idx]) {
        dishSnaps[idx].docs.forEach(d => deletes.push(deleteDoc(d.ref)));
      }
      // Rồi xóa session doc
      deletes.push(deleteDoc(sessionDoc.ref));
    });

    await Promise.all(deletes);

    if (__DEV__) {
      console.log(`[DB] pruneOldSessions: ✅ Done, removed ${toDelete.length} old sessions`);
    }
  } catch (e) {
    // Non-critical: không throw để không crash persistSession
    console.warn('[DB] pruneOldSessions error:', e.message);
  }
}
```

---

### 4.2 `screens/RecommendScreen.js` — Cập nhật `persistSession`

**Bước 1:** Thêm `pruneOldSessions` vào import từ `database.js`

```javascript
// TRƯỚC (dòng ~10):
import {
  saveSession, saveDishesToSession,
  loadRecentDishesCache, saveRecentDishesCache,
  getRecentDishIds, loadSessions, loadDishesBySession,
} from '../utils/database';

// SAU:
import {
  saveSession, saveDishesToSession,
  loadRecentDishesCache, saveRecentDishesCache,
  getRecentDishIds, loadSessions, loadDishesBySession,
  pruneOldSessions,                                      // ← THÊM DÒNG NÀY
} from '../utils/database';
```

**Bước 2:** Sửa hàm `persistSession` — thêm 1 dòng call prune cuối hàm

```javascript
// TRƯỚC:
const persistSession = async (result, params) => {
  const safeParams = params || {};
  try {
    const sid = await saveSession({
      created_at: new Date().toISOString(),
      lat: safeParams.lat ?? null,
      lon: safeParams.lon ?? null,
      province: safeParams.location?.province || '',
      cuisine_scope: safeParams.cuisine_scope || '',
      basket_skipped: safeParams.market_basket?.is_skipped ? 1 : 0,
    });
    setCurrentSessionId(sid);
    if (result.ranked_dishes?.length) {
      await saveDishesToSession(sid, result.ranked_dishes.map(d => ({
        dish_id: d.dish_id, rank: d.rank, final_score: d.final_score,
        ingredient_boost: d.ingredient_boost || 0, title: d.title,
        nation: d.nation || '', cook_time_min: d.cook_time_min || 0,
        explanation: d.explanation || [], image_url: d.image_url || '',
        url: d.url || '', score_breakdown: d.score_breakdown || {},
      })));
    }
  } catch (e) { console.error('persistSession:', e); }
};

// SAU:
const persistSession = async (result, params) => {
  const safeParams = params || {};
  try {
    const sid = await saveSession({
      created_at: new Date().toISOString(),
      lat: safeParams.lat ?? null,
      lon: safeParams.lon ?? null,
      province: safeParams.location?.province || '',
      cuisine_scope: safeParams.cuisine_scope || '',
      basket_skipped: safeParams.market_basket?.is_skipped ? 1 : 0,
    });
    setCurrentSessionId(sid);
    if (result.ranked_dishes?.length) {
      await saveDishesToSession(sid, result.ranked_dishes.map(d => ({
        dish_id: d.dish_id, rank: d.rank, final_score: d.final_score,
        ingredient_boost: d.ingredient_boost || 0, title: d.title,
        nation: d.nation || '', cook_time_min: d.cook_time_min || 0,
        explanation: d.explanation || [], image_url: d.image_url || '',
        url: d.url || '', score_breakdown: d.score_breakdown || {},
      })));
    }

    // ── Prune sessions cũ trong background — không await để không block UI ──
    // Giữ tối đa MAX_SESSIONS_STORED session gần nhất, xóa cũ hơn.
    pruneOldSessions(MAX_SESSIONS_STORED).catch(e =>
      console.warn('[RecommendScreen] pruneOldSessions background error:', e)
    );

  } catch (e) { console.error('persistSession:', e); }
};
```

**Bước 3:** Thêm constant `MAX_SESSIONS_STORED` ở đầu file (sau các import, trước component)

```javascript
// ── Config ────────────────────────────────────────────────────────────────────
const MAX_SESSIONS_STORED = 20; // Giới hạn lịch sử tối đa lưu trên Firestore
```

---

## 5. Luồng sau khi implement

```
User nhấn "Tìm món"
  → fetchRecommendations()
    → api.post('/api/v1/recommend')
      → persistSession()
          → saveSession()           → Firestore ghi session mới (có thể là session #21)
          → saveDishesToSession()   → Firestore ghi dishes
          → pruneOldSessions(20)    ← Fire & Forget (không await)
               [chạy ngầm]
               → getDocs(sessionsCol) theo created_at desc
               → Nếu tổng > 20:
                    → lấy docs từ index 20 trở đi
                    → getDocs(dishesCol) cho từng session cũ (parallel)
                    → deleteDoc tất cả dishes + sessions cũ (Promise.all)
               → Done ✅

HistoryScreen.loadHistory()
  → loadSessions(20)   ← vẫn limit=20, nhưng Firestore cũng chỉ có ≤20 session thật
```

---

## 6. Edge cases & xử lý

| Case | Cách xử lý |
|------|-----------|
| `pruneOldSessions` throw lỗi | `catch` trong hàm + `.catch()` tại call site → không crash app |
| Firestore timeout khi prune | `withTimeoutFallback` 8s → trả `null` → return sớm |
| User có < 20 session | `snap.size <= maxCount` → return ngay, không làm gì |
| Prune chạy đồng thời 2 lần (user search liên tiếp nhanh) | Idempotent: cả 2 lần đọc cùng snapshot → cùng xóa cùng docs → Firestore `deleteDoc` idempotent (xóa doc đã xóa không lỗi) |
| Session vừa tạo bị xóa nhầm | Không thể: sort `created_at desc` → session mới nhất luôn ở index 0 → được giữ lại |
| `withTimeoutFallback` trả `null` | Guard `if (!snap || snap.size <= maxCount) return` bắt luôn |

---

## 7. Không cần thay đổi

- `HistoryScreen.js` — `loadSessions(20)` vẫn hoạt động đúng  
- `HistoryDetailScreen.js` — không liên quan  
- `useAppStore.js` — không liên quan  
- `mealPlanService.js` — không liên quan  
- Bất kỳ Firestore rule nào — không thêm collection mới  

---

## 8. Test checklist

- [ ] Search lần đầu → 1 session được lưu ✅
- [ ] Search 20 lần → đúng 20 session trên Firestore ✅  
- [ ] Search lần 21 → session cũ nhất bị xóa, dishes của nó cũng bị xóa ✅
- [ ] HistoryScreen hiển thị đúng 20 card ✅
- [ ] Không có crash khi search liên tiếp nhanh ✅
- [ ] Khi offline/Firestore lỗi → prune fail gracefully, session mới vẫn được lưu ✅

---

## 9. Tóm tắt thay đổi

```
utils/database.js
  + export async function pruneOldSessions(maxCount = 20)   [thêm ~40 dòng]

screens/RecommendScreen.js
  ~ import { ..., pruneOldSessions } from '../utils/database'  [thêm 1 import]
  + const MAX_SESSIONS_STORED = 20                              [thêm 1 constant]
  ~ persistSession(): thêm pruneOldSessions(MAX_SESSIONS_STORED).catch(...) ở cuối
```

**Tổng thay đổi: ~45 dòng code, 2 file.**
