// services/tasteProfileService.js
// F08 — Taste Profile CRUD với Firestore
import { firestore } from '../utils/firebaseConfig';
import {
  doc, getDoc, setDoc, collection, getDocs,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';

// ─── Bảng mapping food_region → default_taste_profile ──────────────────────
export const REGION_FLAVOR_MAP = {
  red_river_delta:   { sweet:0.3, sour:0.2, salty:0.4, bitter:0.1, umami:0.5, spicy:0.2, astringent:0.1 },
  northern_highland: { sweet:0.2, sour:0.4, salty:0.5, bitter:0.1, umami:0.4, spicy:0.3, astringent:0.2 },
  central_coast:     { sweet:0.1, sour:0.2, salty:0.6, bitter:0.1, umami:0.5, spicy:0.7, astringent:0.1 },
  central_highland:  { sweet:0.3, sour:0.2, salty:0.3, bitter:0.2, umami:0.4, spicy:0.2, astringent:0.2 },
  southeast:         { sweet:0.4, sour:0.2, salty:0.4, bitter:0.1, umami:0.5, spicy:0.3, astringent:0.1 },
  mekong_delta:      { sweet:0.6, sour:0.2, salty:0.3, bitter:0.1, umami:0.5, spicy:0.2, astringent:0.1 },
  urban_major:       { sweet:0.3, sour:0.2, salty:0.3, bitter:0.1, umami:0.5, spicy:0.3, astringent:0.1 },
};

export const DEFAULT_TASTE = { sweet:0.5, sour:0.3, salty:0.4, bitter:0.1, umami:0.5, spicy:0.3, astringent:0.1 };

// ─── Provinces — fallback hardcode 7 vùng khi Firestore offline ────────────
export const FALLBACK_PROVINCES = [
  { id:1,  name:"Hà Nội",           food_region:"urban_major",       regional_flavor:"Fusion, thanh đạm",    taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:2,  name:"Hồ Chí Minh",      food_region:"urban_major",       regional_flavor:"Ngọt, đa dạng",        taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:3,  name:"Đà Nẵng",          food_region:"urban_major",       regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.2,salty:0.6,bitter:0.2,umami:0.6,spicy:0.8,astringent:0.2} },
  { id:4,  name:"Cần Thơ",          food_region:"urban_major",       regional_flavor:"Ngọt, cốt dừa",        taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:5,  name:"Đà Lạt",           food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:10, name:"Hải Phòng",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:11, name:"Hải Dương",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:12, name:"Hưng Yên",         food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:13, name:"Thái Bình",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:14, name:"Nam Định",         food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:15, name:"Ninh Bình",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:16, name:"Hà Nam",           food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:17, name:"Bắc Ninh",         food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:18, name:"Bắc Giang",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:19, name:"Vĩnh Phúc",        food_region:"red_river_delta",   regional_flavor:"Vừa phải, thanh đạm",  taste:{sweet:0.2,sour:0.2,salty:0.3,bitter:0.1,umami:0.6,spicy:0.1,astringent:0.1} },
  { id:20, name:"Hà Giang",         food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:21, name:"Cao Bằng",         food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:22, name:"Bắc Kạn",          food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:23, name:"Lạng Sơn",         food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:24, name:"Tuyên Quang",      food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:25, name:"Lào Cai",          food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:26, name:"Yên Bái",          food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:27, name:"Thái Nguyên",      food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:28, name:"Phú Thọ",          food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:29, name:"Sơn La",           food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:30, name:"Điện Biên",        food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:31, name:"Lai Châu",         food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:32, name:"Hòa Bình",         food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:33, name:"Quảng Ninh",       food_region:"northern_highland", regional_flavor:"Đậm, chua, mắm",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:40, name:"Thanh Hóa",        food_region:"central_coast",     regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.1,salty:0.7,bitter:0.1,umami:0.5,spicy:0.6,astringent:0.1} },
  { id:41, name:"Nghệ An",          food_region:"central_coast",     regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.1,salty:0.7,bitter:0.1,umami:0.5,spicy:0.6,astringent:0.1} },
  { id:42, name:"Hà Tĩnh",          food_region:"central_coast",     regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.1,salty:0.7,bitter:0.1,umami:0.5,spicy:0.6,astringent:0.1} },
  { id:43, name:"Quảng Bình",       food_region:"central_coast",     regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.1,salty:0.7,bitter:0.1,umami:0.5,spicy:0.6,astringent:0.1} },
  { id:44, name:"Quảng Trị",        food_region:"central_coast",     regional_flavor:"Cay, mặn đậm",         taste:{sweet:0.1,sour:0.1,salty:0.7,bitter:0.1,umami:0.5,spicy:0.6,astringent:0.1} },
  { id:45, name:"Thừa Thiên Huế",   food_region:"central_coast",     regional_flavor:"Cay, mặn, tinh tế",    taste:{sweet:0.1,sour:0.2,salty:0.6,bitter:0.2,umami:0.6,spicy:0.8,astringent:0.2} },
  { id:46, name:"Quảng Nam",        food_region:"central_coast",     regional_flavor:"Cay, mặn, tinh tế",    taste:{sweet:0.1,sour:0.2,salty:0.6,bitter:0.2,umami:0.6,spicy:0.8,astringent:0.2} },
  { id:47, name:"Quảng Ngãi",       food_region:"central_coast",     regional_flavor:"Cay, mặn, tinh tế",    taste:{sweet:0.1,sour:0.2,salty:0.6,bitter:0.2,umami:0.6,spicy:0.8,astringent:0.2} },
  { id:48, name:"Bình Định",        food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:49, name:"Phú Yên",          food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:50, name:"Khánh Hòa",        food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:51, name:"Ninh Thuận",       food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:52, name:"Bình Thuận",       food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:53, name:"Phú Quốc",         food_region:"central_coast",     regional_flavor:"Ngọt vừa, umami cao",  taste:{sweet:0.3,sour:0.2,salty:0.4,bitter:0.1,umami:0.7,spicy:0.4,astringent:0.1} },
  { id:60, name:"Kon Tum",          food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:61, name:"Gia Lai",          food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:62, name:"Đắk Lắk",         food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.1} },
  { id:63, name:"Đắk Nông",         food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:64, name:"Lâm Đồng",         food_region:"central_highland",  regional_flavor:"Nhẹ, ít gia vị",       taste:{sweet:0.1,sour:0.1,salty:0.4,bitter:0.4,umami:0.3,spicy:0.4,astringent:0.3} },
  { id:70, name:"Bình Phước",       food_region:"southeast",         regional_flavor:"Ngọt vừa, đa dạng",    taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:71, name:"Tây Ninh",         food_region:"southeast",         regional_flavor:"Ngọt vừa, đa dạng",    taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:72, name:"Bình Dương",       food_region:"southeast",         regional_flavor:"Ngọt vừa, đa dạng",    taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:73, name:"Đồng Nai",         food_region:"southeast",         regional_flavor:"Ngọt vừa, đa dạng",    taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:74, name:"Bà Rịa-Vũng Tàu", food_region:"southeast",         regional_flavor:"Ngọt vừa, đa dạng",    taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:80, name:"Long An",          food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:81, name:"Tiền Giang",       food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:82, name:"Bến Tre",          food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:83, name:"Trà Vinh",         food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:84, name:"Vĩnh Long",        food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:85, name:"Đồng Tháp",        food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:86, name:"An Giang",         food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:87, name:"Kiên Giang",       food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:88, name:"Hậu Giang",        food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:89, name:"Sóc Trăng",        food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:90, name:"Bạc Liêu",         food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
  { id:91, name:"Cà Mau",           food_region:"mekong_delta",      regional_flavor:"Ngọt, cốt dừa, béo",   taste:{sweet:0.6,sour:0.3,salty:0.3,bitter:0.0,umami:0.5,spicy:0.2,astringent:0.0} },
];
// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Lấy taste_profile của user từ Firestore.
 * @param {string} uid
 * @returns {{ tasteProfile, hometownProvinceId, tasteMode } | null}
 */
export const getTasteProfile = async (uid) => {
  try {
    const ref = doc(firestore, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      tasteProfile:      data.taste_profile      ?? null,
      hometownProvinceId: data.hometown_province_id ?? null,
      tasteMode:         data.taste_mode          ?? 'hometown',
    };
  } catch (e) {
    console.error('[tasteProfileService] getTasteProfile:', e);
    return null;
  }
};

/**
 * Lưu taste_profile lên Firestore (merge: true để không ghi đè field khác).
 * @param {string} uid
 * @param {{ tasteProfile, hometownProvinceId, tasteMode }} data
 */
export const saveTasteProfile = async (uid, { tasteProfile, hometownProvinceId, tasteMode }) => {
  const ref = doc(firestore, 'users', uid);
  await setDoc(ref, {
    taste_profile:       tasteProfile,
    hometown_province_id: hometownProvinceId ?? null,
    taste_mode:          tasteMode,
    taste_updated_at:    serverTimestamp(),
  }, { merge: true });
};

/**
 * Lấy 63 tỉnh từ Firestore collection /provinces, sort theo name.
 * Fallback sang FALLBACK_PROVINCES nếu lỗi.
 */
export const getProvinces = async () => {
  try {
    const ref = collection(firestore, 'provinces');
    const q = query(ref, orderBy('name'));
    const snap = await getDocs(q);
    if (snap.empty) return FALLBACK_PROVINCES;
    return snap.docs.map(d => ({ id: d.data().id, ...d.data() }));
  } catch (e) {
    console.warn('[tasteProfileService] getProvinces offline, dùng fallback:', e.message);
    return FALLBACK_PROVINCES;
  }
};

/**
 * Map food_region sang default_taste_profile.
 * @param {string} foodRegion
 */
export const regionToTaste = (foodRegion) =>
  REGION_FLAVOR_MAP[foodRegion] ?? DEFAULT_TASTE;
