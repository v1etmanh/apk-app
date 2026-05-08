# 📄 Yêu cầu Implement: Phân trang (Pagination) cho Kết quả Gợi ý Món Ăn

---

## 1. Bối cảnh & Vấn đề hiện tại

### Cơ chế hiện tại (cần thay đổi)

**Phía Server (`app.py` – route `/api/v1/recommend`):**
- Hàm `rank_and_explain(...)` luôn trả về cứng `top_k=20` món.
- Toàn bộ 20 món được trả về một lần duy nhất trong field `ranked_dishes`.
- Server không nhận tham số phân trang (`page`, `page_size`) từ client.

**Phía App (`RecommendScreen.js`):**
- State `visibleCount` khởi tạo = `10`.
- Top 3 món hiển thị dạng horizontal scroll (`TopCard`), rank 4–10 hiển thị dạng list (`ListRow`).
- Khi người dùng nhấn nút **"Xem thêm X gợi ý ↓"**, gọi `setVisible(dishes.length)` — **mở toàn bộ các món còn lại một lần**, không có hiệu ứng từng bước.
- UX kết quả: người dùng thấy nhảy đột ngột từ 10 lên 20 món.

### Vấn đề UX cần giải quyết
- Người dùng nhấn nút "Xem thêm" chỉ muốn thấy thêm **một nhóm nhỏ** (ví dụ 5–10 món) chứ không muốn bị flood toàn bộ danh sách.
- Không có cảm giác "tải dần từng trang" — thiếu phản hồi trực quan.
- Nếu server sau này hỗ trợ hơn 20 món, app không có cơ chế tải thêm từ server.

---

## 2. Mục tiêu

1. **Thêm phân trang thực sự (true pagination)**: Mỗi lần nhấn "Xem thêm", app tải **một page mới** từ server thay vì chỉ hiện món đã tải sẵn.
2. **Server hỗ trợ tham số `page` và `page_size`**: Trả về đúng phần món theo trang được yêu cầu.
3. **Trải nghiệm liên tục (progressive load)**: Danh sách tích lũy món theo từng trang, không thay thế, không giật.
4. **Không phá vỡ logic hiện có**: Top 3 (`TopCard` horizontal scroll) vẫn giữ nguyên từ page 1.

---

## 3. Thiết kế giải pháp

### 3.1 Thiết kế API – Server (`app.py` + `pipeline.py`)

#### Request body – thêm 2 tham số mới:

```json
{
  "lat": 16.047,
  "lon": 108.206,
  "weather": { ... },
  "personal": { ... },
  "cuisine_scope": "global",
  "dish_type_filter": "all",
  "cost_preference": 2,
  "market_basket": { ... },
  "recent_dish_ids": [],

  // ✅ THÊM MỚI
  "page": 1,
  "page_size": 10
}
```

| Tham số | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `page` | int | `1` | Trang hiện tại (bắt đầu từ 1) |
| `page_size` | int | `10` | Số món mỗi trang (khuyến nghị 5–10, max 20) |

#### Response – thêm các field phân trang:

```json
{
  "status": "ok",
  "ranked_dishes": [...],       // Chỉ các món thuộc page hiện tại

  // ✅ THÊM MỚI
  "page": 1,
  "page_size": 10,
  "total_dishes": 20,           // Tổng số món tìm được (sau filter + score)
  "total_pages": 2,             // Ceil(total_dishes / page_size)
  "has_next_page": true         // Còn trang tiếp không
}
```

#### Thay đổi trong `pipeline.py` – hàm `rank_and_explain`:

```python
# TRƯỚC (cứng top_k=20, trả toàn bộ)
def rank_and_explain(scores, dish_pool, boosts, demand, profile,
                     top_k=20, ...):
    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)
    result = []
    for rank, did in enumerate(sorted_ids[:top_k], 1):
        ...
    return result, sorted_ids[top_k: top_k + 5]

# SAU – tách làm 2 bước:
# Bước 1: rank toàn bộ (vẫn giữ max 20 sau filter/score)
# Bước 2: slice theo page trước khi build explanation (tốn I/O)

def rank_and_explain(scores, dish_pool, boosts, demand, profile,
                     top_k=20,          # Tổng số món rank (pool limit)
                     page=1,            # ✅ THÊM
                     page_size=10,      # ✅ THÊM
                     ...):

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)
    total = min(len(sorted_ids), top_k)   # Tổng sau rank

    # Tính slice index
    start = (page - 1) * page_size
    end   = start + page_size
    page_ids = sorted_ids[start:end]      # Chỉ build explanation cho page này

    dish_map = {d["id"]: d for d in dish_pool}
    result   = []
    for rank_abs, did in enumerate(page_ids, start=start+1):  # rank tuyệt đối
        dish  = dish_map.get(did, {})
        boost = boosts.get(did, 0.0)
        # build explanation... (giữ nguyên logic)
        result.append({
            "rank": rank_abs,   # rank thật trong toàn bộ danh sách
            ...
        })

    total_pages = math.ceil(total / page_size)
    has_next    = page < total_pages

    return result, sorted_ids[top_k: top_k+5], total, total_pages, has_next
```

#### Thay đổi trong `app.py` – route `/api/v1/recommend`:

```python
@app.route("/api/v1/recommend", methods=["POST"])
@require_auth
@rate_limit(max_calls=10, window_seconds=60)
def recommend():
    body = request.get_json(force=True) or {}

    # ✅ THÊM: đọc tham số phân trang
    page      = max(1, _parse_int(body.get("page"), 1, lo=1))
    page_size = max(1, min(20, _parse_int(body.get("page_size"), 10, lo=1, hi=20)))

    # ... (giữ nguyên logic tính score) ...

    ranked, fallback_ids, total, total_pages, has_next = rank_and_explain(
        scores, dish_pool, boosts, demand, profile,
        loc=loc, season=season,
        basket_ingredient_ids=selected_ids,
        db=db, temperature=_temperature,
        page=page,           # ✅ THÊM
        page_size=page_size, # ✅ THÊM
    )

    return jsonify({
        "status":        "ok",
        "ranked_dishes": ranked,
        # ✅ THÊM
        "page":          page,
        "page_size":     page_size,
        "total_dishes":  total,
        "total_pages":   total_pages,
        "has_next_page": has_next,
        # ... giữ nguyên các field khác ...
    })
```

> **⚠️ Lưu ý quan trọng về hiệu suất:** Vì server hiện tại tính toán score cho toàn bộ `dish_pool` (có thể lên đến 5000 món từ DB), chỉ bước `build_explanation` là được slice theo page. Đây là thiết kế đúng — tránh phải re-score khi sang trang mới.

---

### 3.2 Thiết kế App – `RecommendScreen.js`

#### State mới cần thêm:

```javascript
// TRƯỚC
const [dishes, setDishes]        = useState([]);
const [visibleCount, setVisible] = useState(10);

// SAU – xóa visibleCount, thêm pagination state
const [dishes, setDishes]           = useState([]);   // Tích lũy qua các trang
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages]   = useState(1);
const [hasNextPage, setHasNextPage] = useState(false);
const [isLoadingMore, setIsLoadingMore] = useState(false);  // Loading riêng cho "Xem thêm"
const PAGE_SIZE = 10;  // Phải khớp với page_size gửi lên server
```

#### Tách hàm fetch thành 2 loại:

```javascript
// Tải trang đầu tiên (khi vào màn, hoặc nhấn "Làm mới")
const fetchFirstPage = async () => {
  setIsLoading(true);
  setDishes([]);         // Reset toàn bộ
  setCurrentPage(1);
  await _fetchPage(1);
  setIsLoading(false);
};

// Tải trang tiếp theo (nhấn "Xem thêm")
const fetchNextPage = async () => {
  if (!hasNextPage || isLoadingMore) return;
  setIsLoadingMore(true);
  await _fetchPage(currentPage + 1);
  setIsLoadingMore(false);
};

// Hàm gọi API nội bộ
const _fetchPage = async (page) => {
  const signal = abortRef.current?.signal;
  try {
    const res = await api.post('/api/v1/recommend', {
      ...searchParams,
      recent_dish_ids: await getRecentDishIds(3),
      page,                  // ✅ THÊM
      page_size: PAGE_SIZE,  // ✅ THÊM
    }, { signal });

    if (signal?.aborted) return;

    const incoming = res.data.ranked_dishes || [];

    if (page === 1) {
      setDishes(incoming);            // Reset nếu là trang đầu
    } else {
      setDishes(prev => [...prev, ...incoming]);  // Tích lũy nếu là trang kế
    }

    setCurrentPage(res.data.page);
    setTotalPages(res.data.total_pages);
    setHasNextPage(res.data.has_next_page);

    // Chỉ persist session khi tải trang đầu
    if (page === 1) {
      await saveRecentDishesCache(incoming);
      await persistSession(res.data, searchParams);
    }

  } catch (e) {
    if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
    // fallback offline giữ nguyên như cũ
    const cached = await loadRecentDishesCache();
    if (cached.length) { setDishes(cached); setError('offline'); }
    else setError('empty');
  }
};
```

#### Cập nhật `useEffect` và nút "Làm mới":

```javascript
// Mount: tải trang đầu
useEffect(() => {
  fetchFirstPage();
  return () => { if (abortRef.current) abortRef.current.abort(); };
}, []);

// Nút "Làm mới" trong header → gọi fetchFirstPage thay vì fetchRecommendations
<TouchableOpacity onPress={fetchFirstPage} ...>
```

#### Thay đổi UI – nút "Xem thêm":

```javascript
// TRƯỚC
{visibleCount < dishes.length && (
  <TouchableOpacity onPress={() => setVisible(dishes.length)} ...>
    <Text>Xem thêm {dishes.length - visibleCount} gợi ý ↓</Text>
  </TouchableOpacity>
)}

// SAU – phân trang thực sự
{hasNextPage && (
  <TouchableOpacity
    onPress={fetchNextPage}
    disabled={isLoadingMore}
    activeOpacity={0.80}
  >
    <ImageBackground source={ASSETS.paper} style={s.loadMoreBtn} ...>
      <View style={...}>
        {isLoadingMore
          ? <ActivityIndicator color={C.text} />
          : <Text style={s.loadMoreText}>
              Xem thêm gợi ý · Trang {currentPage + 1}/{totalPages} ↓
            </Text>
        }
      </View>
    </ImageBackground>
  </TouchableOpacity>
)}
```

#### Render danh sách – bỏ `slice` theo `visibleCount`:

```javascript
// TRƯỚC
{dishes.slice(3, visibleCount).map(item => <ListRow ... />)}

// SAU – toàn bộ dishes đã tích lũy đều hiển thị (slice(3) để bỏ top 3)
{dishes.slice(3).map(item => <ListRow ... />)}
```

---

## 4. Checklist thay đổi đầy đủ

### Server (`demo_server/`)

| File | Thay đổi |
|---|---|
| `pipeline.py` | Hàm `rank_and_explain` thêm param `page`, `page_size`. Slice `page_ids` trước khi build explanation. Return thêm `total`, `total_pages`, `has_next`. |
| `app.py` | Route `/api/v1/recommend` đọc `page` và `page_size` từ body. Truyền vào `rank_and_explain`. Response thêm 5 field phân trang. |

### App (`mobile_app/`)

| File | Thay đổi |
|---|---|
| `screens/RecommendScreen.js` | Xóa `visibleCount`. Thêm `currentPage`, `totalPages`, `hasNextPage`, `isLoadingMore`. Tách thành `fetchFirstPage` + `fetchNextPage` + `_fetchPage`. Cập nhật render danh sách (bỏ `slice(3, visibleCount)`). Cập nhật nút "Xem thêm". Nút "Làm mới" → gọi `fetchFirstPage`. |
| `services/api.js` | Không cần thay đổi (chỉ thêm body params khi gọi POST). |

---

## 5. Các trường hợp biên (Edge cases)

| Trường hợp | Xử lý |
|---|---|
| Tổng số món < `page_size` | `has_next_page = false`, không hiển thị nút "Xem thêm" |
| Người dùng nhấn "Làm mới" giữa chừng đang load trang 2 | `AbortController` hủy request cũ, `fetchFirstPage` reset toàn bộ state |
| Offline khi nhấn "Xem thêm" | Hiển thị thông báo lỗi nhỏ phía dưới list, không xóa dữ liệu đã load |
| `page` vượt `total_pages` | Server trả `ranked_dishes: []`, `has_next_page: false` |
| `page_size` không hợp lệ | Server clamp về range `[1, 20]` |

---

## 6. Luồng hoạt động hoàn chỉnh (Happy path)

```
Người dùng bấm "Tìm món" ở HomeScreen
        │
        ▼
RecommendScreen mount
→ fetchFirstPage()
→ POST /api/v1/recommend { page: 1, page_size: 10 }
        │
        ▼
Server trả 10 món đầu + has_next_page: true
→ Hiển thị Top 3 (TopCard) + 7 ListRow (rank 4-10)
→ Hiển thị nút "Xem thêm · Trang 2/2 ↓"
        │
        ▼ (người dùng nhấn "Xem thêm")
→ fetchNextPage()
→ POST /api/v1/recommend { page: 2, page_size: 10 }
        │
        ▼
Server trả 10 món tiếp + has_next_page: false
→ Append vào dishes (tổng = 20)
→ Ẩn nút "Xem thêm" (vì has_next_page = false)
→ Hiển thị thêm 10 ListRow (rank 11-20)
```

---

## 7. Lưu ý bổ sung cho AI implement

1. **Không thay đổi scoring logic**: Toàn bộ `score_dish`, `filter_dishes`, `compute_demand` giữ nguyên. Chỉ thêm slice ở bước cuối trong `rank_and_explain`.

2. **`top_k` vẫn là 20**: Server vẫn rank tối đa 20 món, sau đó slice theo page. Nếu muốn mở rộng pool lớn hơn thì đó là task riêng.

3. **`persistSession` và `saveRecentDishesCache` chỉ chạy ở page 1**: Tránh ghi đè session khi tải trang kế.

4. **Top 3 `TopCard`**: Vẫn lấy từ `dishes.slice(0, 3)` — nên sau khi load page 2, top 3 không thay đổi (đúng về UX). Đây là hành vi mong muốn.

5. **`rank` trong response là rank tuyệt đối**: Món ở page 2 có rank từ 11–20, không phải 1–10 lại. Cần đảm bảo `rank_abs = start + index + 1`.

6. **Backward compatibility**: Nếu client cũ không gửi `page`/`page_size`, server fallback về `page=1, page_size=10` — không breaking change.

7. **Rate limit**: Mỗi lần "Xem thêm" là 1 API call riêng. Rate limit hiện tại `10 calls/60s` vẫn đủ cho use case bình thường (người dùng khó nhấn >10 lần/phút).
