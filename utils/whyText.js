// utils/whyText.js
// "Vì sao chọn món này": server trả `why` có cấu trúc (code + số liệu thật, sinh từ sổ cái điểm).
// File này ghép câu theo ngôn ngữ app — dùng chung cho màn Gợi ý và màn Chi tiết món.
import { formatVnd } from './price';

export const WHY_GROUPS = ['weather', 'taste', 'place_season', 'basket'];

export const WHY_GROUP_STYLE = {
  weather:      { color: '#D9822B', icon: 'partly-sunny-outline' },
  taste:        { color: '#C0573E', icon: 'restaurant-outline' },
  place_season: { color: '#4E9A68', icon: 'leaf-outline' },
  basket:       { color: '#7C6BB0', icon: 'basket-outline' },
};

const REASON_STYLE = {
  weather_cooling:   { group: 'weather', icon: 'snow-outline' },
  weather_warming:   { group: 'weather', icon: 'flame-outline' },
  weather_hydration: { group: 'weather', icon: 'water-outline' },
  body_satiety:      { group: 'weather', icon: 'body-outline' },
  body_energy:       { group: 'weather', icon: 'flash-outline' },
  taste_match:       { group: 'taste', icon: 'restaurant-outline' },
  local_season:      { group: 'place_season', icon: 'leaf-outline' },
  home_region:       { group: 'place_season', icon: 'home-outline' },
  basket_ready:      { group: 'basket', icon: 'checkmark-done-outline' },
  basket_partial:    { group: 'basket', icon: 'basket-outline' },
  liked:             { group: 'taste', icon: 'heart-outline' },
};

const TRADEOFF_ICON = {
  cook_time_over: 'time-outline',
  price_above: 'wallet-outline',
  off_season: 'calendar-outline',
  eaten_recently: 'repeat-outline',
  disliked: 'thumbs-down-outline',
  weather_below: 'thermometer-outline',
  other_region: 'map-outline',
  taste_off: 'alert-circle-outline',
  need_buy: 'cart-outline',
};

/** Có dữ liệu "why" mới (server ≥ v1) hay không. */
export const hasWhy = (why) => !!why && typeof why === 'object' && Array.isArray(why.reasons);

const lang = (i18n) => ((i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi');
const tasteName = (t, k) => (k ? t(`why.taste.${k}`) : '');
const regionName = (t, r) => (r ? t(`why.region.${r}`, { defaultValue: r }) : '');
const joinList = (arr = []) => arr.filter(Boolean).join(', ');
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Cụm ngắn cho tiêu đề / dòng phụ trong danh sách. '' nếu lý do không đủ đặc sắc. */
export function shortPhrase(r, t) {
  const f = r?.facts || {};
  switch (r?.code) {
    case 'weather_cooling':
    case 'weather_warming':
      return f.temp != null ? t(`why.short.${r.code}`, { temp: f.temp }) : t(`why.short.${r.code}_noTemp`);
    case 'weather_hydration':
    case 'body_satiety':
    case 'body_energy':
    case 'basket_ready':
    case 'liked':
      return t(`why.short.${r.code}`);
    case 'taste_match': {
      const ks = (f.tastes || []).map(x => tasteName(t, x.k));
      if (ks.length) return t('why.short.taste_match', { tastes: ks.join(' & ') });
      if (f.avoids?.length) return t('why.short.taste_avoid', { taste: tasteName(t, f.avoids[0]) });
      return '';
    }
    case 'local_season':
      return f.ings?.length ? t('why.short.local_season', { ings: joinList(f.ings) }) : '';
    case 'basket_partial':
      return t('why.short.basket_partial', { have: f.main_have, total: f.main_total });
    case 'home_region':
      return t('why.short.home_region', { region: regionName(t, f.region) });
    default:
      return '';
  }
}

/** Câu kết luận: 2 lý do mạnh nhất có thể nói thành lời. */
export function whyHeadline(why, t) {
  if (!hasWhy(why)) return '';
  const parts = why.reasons.map(r => shortPhrase(r, t)).filter(Boolean).slice(0, 2);
  return parts.length ? capFirst(parts.join(', ')) : t('why.fallback');
}

/** Nhãn ngắn (emoji + chữ) cho chip trên thẻ món. */
export function whyTags(why, t, max = 3) {
  if (!hasWhy(why)) return [];
  const out = [];
  for (const r of why.reasons) {
    if (r.code === 'taste_match') {
      const k = r.facts?.tastes?.[0]?.k;
      if (k) out.push(t('why.tag.taste', { taste: tasteName(t, k) }));
    } else if (r.code === 'local_season') {
      if (r.facts?.ings?.length) out.push(t('why.tag.local_season'));
    } else {
      out.push(t(`why.tag.${r.code}`, { defaultValue: '' }));
    }
  }
  return out.filter(Boolean).slice(0, max);
}

/** Thẻ lý do chi tiết: { key, icon, color, title, chips[] }. */
export function reasonView(r, t) {
  const f = r.facts || {};
  const style = REASON_STYLE[r.code] || { group: 'taste', icon: 'sparkles-outline' };
  const color = WHY_GROUP_STYLE[style.group].color;
  let title = '';
  const chips = [];
  switch (r.code) {
    case 'weather_cooling':
    case 'weather_warming':
    case 'weather_hydration':
      title = f.temp != null
        ? t(`why.reason.${r.code}`, { temp: f.temp, pct: f.pct })
        : t(`why.reason.${r.code}_noTemp`, { pct: f.pct });
      if (f.ings?.length) chips.push(t('why.chip.fromIngs', { ings: joinList(f.ings) }));
      break;
    case 'body_satiety':
      title = t('why.reason.body_satiety', { pct: f.pct });
      if (f.ings?.length) chips.push(t('why.chip.fromIngs', { ings: joinList(f.ings) }));
      break;
    case 'body_energy':
      title = t('why.reason.body_energy', { kcal: f.kcal, target: f.target });
      break;
    case 'taste_match':
      title = t(f.source === 'profile' ? 'why.reason.taste_profile' : 'why.reason.taste_region');
      (f.tastes || []).forEach(x => {
        chips.push(t('why.chip.userTaste', { taste: tasteName(t, x.k), n: x.user }));
        chips.push(t('why.chip.dishTaste', { taste: tasteName(t, x.k), pct: x.pct }));
      });
      (f.avoids || []).forEach(k => chips.push(t('why.chip.avoid', { taste: tasteName(t, k) })));
      break;
    case 'local_season':
      title = f.province ? t('why.reason.local_season', { province: f.province }) : t('why.reason.local_season_noPlace');
      if (f.ings?.length) chips.push(t('why.chip.seasonIngs', { ings: joinList(f.ings) }));
      // Câu đã nói "dễ mua"; chỉ nêu % khi chưa tới mức gần như chắc chắn
      if (f.avail != null && f.avail < 95) chips.push(t('why.chip.avail', { n: f.avail }));
      break;
    case 'home_region':
      title = t('why.reason.home_region', { region: regionName(t, f.region) });
      if (f.origin) chips.push(t('why.chip.origin', { origin: f.origin }));
      chips.push(t(f.everyday ? 'why.chip.everyday' : 'why.chip.specialty'));
      break;
    case 'basket_ready':
    case 'basket_partial':
      title = t(`why.reason.${r.code}`, { have: f.main_have, total: f.main_total });
      if (f.have?.length) chips.push(t('why.chip.have', { list: joinList(f.have) }));
      if (f.missing?.length) chips.push(t('why.chip.missing', { list: joinList(f.missing) }));
      break;
    case 'liked':
      title = t('why.reason.liked');
      break;
    default:
      title = shortPhrase(r, t);
  }
  return { key: r.code, icon: style.icon, color, title, chips };
}

const MULT_ICON = { soft: 'time-outline', liked: 'heart-outline', region: 'home-outline', recent: 'repeat-outline' };
const pts100 = (v) => Math.round((v || 0) * 100);

/** Có khối công thức điểm (server why v2) hay không. */
export const hasFormula = (why) => !!why?.formula && Array.isArray(why.formula.terms);

/**
 * Công thức điểm, thang 100 — mỗi dòng là món này HƠN / KÉM món trung bình bao nhiêu điểm.
 * { score, base, diff, rows: [{ key, icon, color, label, mult, edge }] }  (tổng edge = diff)
 */
export function formulaView(why, t) {
  if (!hasFormula(why)) return null;
  const f = why.formula;
  const rows = f.terms.map(x => ({
    key: x.k,
    icon: WHY_GROUP_STYLE[x.k]?.icon || 'ellipse-outline',
    color: WHY_GROUP_STYLE[x.k]?.color || '#888',
    label: t(`why.group.${x.k}`),
    mult: null,
    edge: pts100(x.edge),
  }));
  f.mults.forEach(m => {
    const up = m.x > 1;
    rows.push({
      key: `m_${m.k}`,
      icon: MULT_ICON[m.k] || 'close-outline',
      color: up ? '#4E9A68' : '#B5543C',
      label: t(`why.mult.${m.k}_${up ? 'up' : 'down'}`, { defaultValue: m.k }),
      mult: `×${Number(m.x).toFixed(2)}`,
      edge: pts100(m.edge),
    });
  });
  const score = pts100(f.score);
  const base = f.base != null ? pts100(f.base) : null;
  const diff = base != null ? score - base : null;
  // Làm tròn từng dòng có thể lệch 1–2 điểm so với tổng: dồn phần lệch vào dòng lớn nhất
  if (diff != null && rows.length) {
    const drift = diff - rows.reduce((a, r) => a + r.edge, 0);
    if (drift) {
      const top = rows.reduce((a, r) => (Math.abs(r.edge) > Math.abs(a.edge) ? r : a), rows[0]);
      top.edge += drift;
    }
  }
  return { score, base, diff, rows };
}

/** Điều chưa hợp: { key, icon, text }. */
export function tradeoffView(tr, t, i18n) {
  const f = tr.facts || {};
  let text;
  switch (tr.code) {
    case 'cook_time_over':
      text = t('why.tradeoff.cook_time_over', { min: f.min, limit: f.limit });
      break;
    case 'price_above': {
      const price = formatVnd(f.vnd, lang(i18n));
      text = price ? t('why.tradeoff.price_above', { price }) : t('why.tradeoff.price_above_noPrice');
      break;
    }
    case 'off_season':
      text = t('why.tradeoff.off_season', { season: t(`why.seasonName.${f.season}`, { defaultValue: f.season || '' }) });
      break;
    case 'other_region':
      text = t('why.tradeoff.other_region', { region: regionName(t, f.region) });
      break;
    case 'taste_off':
      text = f.k ? t('why.tradeoff.taste_off', { taste: tasteName(t, f.k) }) : t('why.tradeoff.taste_off_noTaste');
      break;
    case 'need_buy':
      text = t('why.tradeoff.need_buy', { list: joinList(f.missing) });
      break;
    case 'weather_below':
      text = t('why.tradeoff.weather_below', { pts: f.pts });
      break;
    default:
      text = t(`why.tradeoff.${tr.code}`, { defaultValue: '' });
  }
  if (text && tr.loss > 0) text = `${text} (${t('why.tradeoff.loss', { n: tr.loss })})`;
  return { key: tr.code, icon: TRADEOFF_ICON[tr.code] || 'alert-circle-outline', text };
}
