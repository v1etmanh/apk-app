export const MAX_FAMILY_MEMBERS = 5;

// Shared by onboarding and every profile avatar. Age is derived, never stored as a group.
export const PROFILE_AGE_GROUPS = [
  { key: 'toddler', min: 0, max: 5, male: 'boy-toddler-bong', female: 'girl-toddler-sua' },
  { key: 'child', min: 6, max: 11, male: 'boy-child-but-chi', female: 'girl-child-no' },
  { key: 'youth', min: 12, max: 24, male: 'boy-youth-beat', female: 'girl-youth-may' },
  { key: 'adult', min: 25, max: 59, male: 'man-adult-moka', female: 'woman-adult-la' },
  { key: 'senior', min: 60, max: 120, male: 'man-senior-tra', female: 'woman-senior-mai' },
];

export function getProfileAge(profile, currentYear = new Date().getFullYear()) {
  const raw = profile?.birth_year;
  if (!/^[0-9]{4}$/.test(String(raw ?? ''))) return null;
  const age = currentYear - Number(raw);
  return Number.isInteger(age) && age >= 0 && age <= 120 ? age : null;
}

export function getProfileAgeGroup(profile, currentYear = new Date().getFullYear()) {
  const age = getProfileAge(profile, currentYear);
  return age === null ? null : PROFILE_AGE_GROUPS.find(group => age >= group.min && age <= group.max);
}

export function resolveProfileAvatar(profile, currentYear = new Date().getFullYear()) {
  const age = getProfileAge(profile, currentYear);
  const female = profile?.gender === 'female';
  if (!female && profile?.gender !== 'male') return { key: null, age, reason: 'missing-gender' };
  if (age !== null) {
    const key = getProfileAgeGroup(profile, currentYear)[profile.gender];
    return { key, age, reason: 'birth-year' };
  }
  const pairs = { child: ['kitten', 'tabby-girl'], sibling: ['brother', 'sister'], parent: ['father', 'mother'], spouse: ['father', 'mother'] };
  return { key: pairs[profile?.relation]?.[female ? 1 : 0] ?? null, age, reason: 'missing-birth-year' };
}

export function assertBirthYear(birthYear, currentYear = new Date().getFullYear()) {
  const age = getProfileAge({ birth_year: birthYear }, currentYear);
  if (age === null) {
    const error = new Error('INVALID_BIRTH_YEAR');
    error.code = 'INVALID_BIRTH_YEAR';
    throw error;
  }
  return { birth_year: Number(birthYear), age };
}

export function assertProfileCapacity(profiles, profileId) {
  if (profiles.some(p => p.profileId === profileId)) return;
  if (profiles.length >= MAX_FAMILY_MEMBERS) {
    const error = new Error('PROFILE_LIMIT_REACHED');
    error.code = 'PROFILE_LIMIT_REACHED';
    throw error;
  }
}
