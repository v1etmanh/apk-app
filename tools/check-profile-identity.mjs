// Kiểm thử nhanh quy tắc avatar mèo + giới hạn 5 hồ sơ (dự án chưa có jest).
// Chạy: node tools/check-profile-identity.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const src = readFileSync(fileURLToPath(new URL('../utils/profileIdentity.js', import.meta.url)), 'utf8');
const {
  getProfileAge, resolveProfileAvatar, assertBirthYear, assertProfileCapacity, MAX_FAMILY_MEMBERS,
} = await import('data:text/javascript,' + encodeURIComponent(src));

let passed = 0;
const check = (name, fn) => {
  try { fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
};
const Y = 2026;
const key = (p, y = Y) => resolveProfileAvatar(p, y).key;

// Tuổi biên
const table = [
  [0, 'kitten', 'tabby-girl'], [11, 'kitten', 'tabby-girl'],
  [12, 'brother', 'sister'], [24, 'brother', 'sister'],
  [25, 'father', 'mother'], [59, 'father', 'mother'],
  [60, 'grandpa', 'grandma'], [120, 'grandpa', 'grandma'],
];
for (const [age, m, f] of table) {
  check(`tuổi ${age} nam`, () => assert.equal(key({ gender: 'male', birth_year: Y - age }), m));
  check(`tuổi ${age} nữ`, () => assert.equal(key({ gender: 'female', birth_year: Y - age }), f));
}

// Sang năm mới: sinh 2002 → 24 tuổi năm 2026 (anh), 25 tuổi năm 2027 (bố)
check('sang năm mới đổi nhóm', () => {
  assert.equal(key({ gender: 'male', birth_year: 2002 }, 2026), 'brother');
  assert.equal(key({ gender: 'male', birth_year: 2002 }, 2027), 'father');
});

// Năm sinh không hợp lệ
for (const bad of [Y + 1, Y - 121, '19x8', '98', '', null, undefined, 1998.5]) {
  check(`năm sinh lỗi ${String(bad)}`, () => assert.equal(getProfileAge({ birth_year: bad }, Y), null));
}
check('năm sinh dạng chuỗi hợp lệ', () => assert.equal(getProfileAge({ birth_year: '1998' }, Y), 28));
check('không dùng trường age đã lưu', () => assert.equal(getProfileAge({ age: 30 }, Y), null));

// Tuổi ưu tiên hơn Quan hệ
check('nam 28 tuổi quan hệ Con → bố', () =>
  assert.deepEqual(resolveProfileAvatar({ gender: 'male', birth_year: 1998, relation: 'child' }, Y),
    { key: 'father', age: 28, reason: 'birth-year' }));

// Dự phòng theo Quan hệ khi thiếu năm sinh
const fallback = [
  ['child', 'kitten', 'tabby-girl'], ['sibling', 'brother', 'sister'],
  ['parent', 'father', 'mother'], ['spouse', 'father', 'mother'],
  ['self', null, null], ['other', null, null],
];
for (const [relation, m, f] of fallback) {
  check(`dự phòng ${relation}`, () => {
    assert.equal(key({ gender: 'male', relation }), m);
    assert.equal(key({ gender: 'female', relation }), f);
  });
}
check('thiếu giới tính → trung tính', () =>
  assert.equal(resolveProfileAvatar({ birth_year: 1998, relation: 'parent' }, Y).reason, 'missing-gender'));

// assertBirthYear
check('assertBirthYear hợp lệ', () => assert.deepEqual(assertBirthYear('1990', Y), { birth_year: 1990, age: 36 }));
check('assertBirthYear lỗi', () => assert.throws(() => assertBirthYear('', Y), { code: 'INVALID_BIRTH_YEAR' }));

// Giới hạn 5 hồ sơ
const five = Array.from({ length: MAX_FAMILY_MEMBERS }, (_, i) => ({ profileId: `p${i}` }));
check('giới hạn là 5', () => assert.equal(MAX_FAMILY_MEMBERS, 5));
check('người thứ 5 được thêm', () => assert.doesNotThrow(() => assertProfileCapacity(five.slice(0, 4), 'new')));
check('người thứ 6 bị chặn', () => assert.throws(() => assertProfileCapacity(five, 'new'), { code: 'PROFILE_LIMIT_REACHED' }));
check('id mới null cũng bị chặn', () => assert.throws(() => assertProfileCapacity(five, null), { code: 'PROFILE_LIMIT_REACHED' }));
check('sửa khi đủ 5 vẫn được', () => assert.doesNotThrow(() => assertProfileCapacity(five, 'p2')));
check('tài khoản cũ đã vượt 5 vẫn sửa được', () =>
  assert.doesNotThrow(() => assertProfileCapacity([...five, { profileId: 'p5' }], 'p5')));
check('xóa một người rồi thêm lại', () => assert.doesNotThrow(() => assertProfileCapacity(five.slice(1), 'new')));

if (process.exitCode) console.error(`\n${passed} ca qua, có ca thất bại.`);
else console.log(`✓ ${passed} ca kiểm thử đều qua.`);
