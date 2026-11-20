// Kiểm thử nhanh quy tắc avatar mèo + giới hạn 5 hồ sơ (dự án chưa có jest).
// Chạy: node tools/check-profile-identity.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const src = readFileSync(fileURLToPath(new URL('../utils/profileIdentity.js', import.meta.url)), 'utf8');
const {
  getProfileAge, getProfileAgeGroup, PROFILE_AGE_GROUPS, resolveProfileAvatar, assertBirthYear, assertProfileCapacity, MAX_FAMILY_MEMBERS,
} = await import('data:text/javascript,' + encodeURIComponent(src));

let passed = 0;
const check = (name, fn) => {
  try { fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
};
const Y = 2026;
const key = (p, y = Y) => resolveProfileAvatar(p, y).key;

// Tuổi biên
const table = [
  [0, 'boy-toddler-bong', 'girl-toddler-sua'], [5, 'boy-toddler-bong', 'girl-toddler-sua'],
  [6, 'boy-child-but-chi', 'girl-child-no'], [11, 'boy-child-but-chi', 'girl-child-no'],
  [12, 'boy-youth-beat', 'girl-youth-may'], [24, 'boy-youth-beat', 'girl-youth-may'],
  [25, 'man-adult-moka', 'woman-adult-la'], [59, 'man-adult-moka', 'woman-adult-la'],
  [60, 'man-senior-tra', 'woman-senior-mai'], [120, 'man-senior-tra', 'woman-senior-mai'],
];
for (const [age, m, f] of table) {
  check(`tuổi ${age} nam`, () => assert.equal(key({ gender: 'male', birth_year: Y - age }), m));
  check(`tuổi ${age} nữ`, () => assert.equal(key({ gender: 'female', birth_year: Y - age }), f));
}

// Sang năm mới: sinh 2002 → 24 tuổi năm 2026 (anh), 25 tuổi năm 2027 (bố)
check('sang năm mới đổi nhóm', () => {
  assert.equal(key({ gender: 'male', birth_year: 2002 }, 2026), 'boy-youth-beat');
  assert.equal(key({ gender: 'male', birth_year: 2002 }, 2027), 'man-adult-moka');
});

check('5 nhóm phủ kín 0–120, không chồng lặp', () => {
  assert.equal(PROFILE_AGE_GROUPS.length, 5);
  for (let age = 0; age <= 120; age++) {
    assert.equal(PROFILE_AGE_GROUPS.filter(g => age >= g.min && age <= g.max).length, 1);
    const group = getProfileAgeGroup({ birth_year: Y - age }, Y);
    for (const gender of ['male', 'female']) assert.equal(key({ gender, birth_year: Y - age }), group[gender]);
  }
});
check('nhóm tuổi trống khi năm sinh không hợp lệ', () => {
  for (const birth_year of [null, '', '20', Y + 1, Y - 121]) assert.equal(getProfileAgeGroup({ birth_year }, Y), null);
});
check('mỗi mốc tuổi tự đổi khi sang năm', () => {
  for (const boundary of [6, 12, 25, 60]) {
    for (const gender of ['male', 'female']) {
      const profile = { gender, birth_year: Y - boundary + 1 };
      assert.notEqual(key(profile, Y), key(profile, Y + 1));
    }
  }
});
check('10 mèo mới có source Metro và JSON hợp lệ', () => {
  const avatarSource = readFileSync(new URL('../components/ui/ProfileAvatar.js', import.meta.url), 'utf8');
  const ids = PROFILE_AGE_GROUPS.flatMap(g => [g.male, g.female]);
  assert.equal(new Set(ids).size, 10);
  for (const id of ids) {
    assert(avatarSource.includes(`'${id}': require('../../assets/animations/plan/${id}.json')`));
    const animation = JSON.parse(readFileSync(new URL(`../assets/animations/plan/${id}.json`, import.meta.url)));
    assert(animation.layers.length > 0);
    assert.equal(animation.fr, 30);
    assert.equal(animation.op - animation.ip, 90);
  }
});
for (const language of ['vi', 'en']) {
  const source = readFileSync(new URL(`../i18n/locales/${language}.js`, import.meta.url), 'utf8');
  const { default: locale } = await import('data:text/javascript,' + encodeURIComponent(source));
  check(`nhóm tuổi và tên mèo có đủ bản dịch ${language}`, () => {
    for (const group of PROFILE_AGE_GROUPS) {
      assert(locale.familyAvatar.ageGroups[group.key]);
      assert(locale.familyAvatar.characters[group.male]);
      assert(locale.familyAvatar.characters[group.female]);
    }
  });
}

// Năm sinh không hợp lệ
for (const bad of [Y + 1, Y - 121, '19x8', '98', '', null, undefined, 1998.5]) {
  check(`năm sinh lỗi ${String(bad)}`, () => assert.equal(getProfileAge({ birth_year: bad }, Y), null));
}
check('năm sinh dạng chuỗi hợp lệ', () => assert.equal(getProfileAge({ birth_year: '1998' }, Y), 28));
check('không dùng trường age đã lưu', () => assert.equal(getProfileAge({ age: 30 }, Y), null));

// Tuổi ưu tiên hơn Quan hệ
check('nam 28 tuổi quan hệ Con → Moka', () =>
  assert.deepEqual(resolveProfileAvatar({ gender: 'male', birth_year: 1998, relation: 'child' }, Y),
    { key: 'man-adult-moka', age: 28, reason: 'birth-year' }));

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
