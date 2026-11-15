// components/onboarding/AllergyScopeSheet.js
// Khi user chọn một nhóm dị ứng (vd. Hải sản):
//   Bước 1 — "Bạn dị ứng hầu hết hải sản hay chỉ một số loại?"
//   Bước 2 — (chỉ một số loại) danh sách nguyên liệu của nhóm để tick cụ thể.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, R, F } from '../../theme';
import { PrimaryButton } from './OnbLayout';
import { fetchAllergyIngredients } from '../../services/onboardingService';
import { MascotCat } from '../ui/Mascot';
import { CheckDot } from '../ui/Notebook';

const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/**
 * props:
 *   group        — key nhóm ('seafood'…) hoặc null (đóng)
 *   initialScope — 'all' | 'some' | null
 *   initialIds   — id nguyên liệu đã chọn của nhóm này
 *   onSubmit({ scope: 'all' | 'some' | 'none', items: [{id, name}] })
 *   onClose()
 */
const AllergyScopeSheet = ({ group, emoji, initialScope, initialIds = [], onSubmit, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('scope');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Map());

  const groupLabel = group ? t(`onboarding.allergies.${group}`) : '';

  useEffect(() => {
    if (!group) return;
    setStep(initialScope === 'some' ? 'pick' : 'scope');
    setQuery('');
    setSelected(new Map(initialIds.map(i => [Number(i.id ?? i), i.name ?? ''])));
    if (initialScope === 'some') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await fetchAllergyIngredients(group));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? items.filter(i => normalize(i.name).includes(q)) : items;
  }, [items, query]);

  const toggle = (item) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id); else next.set(item.id, item.name);
      return next;
    });
  };

  const chooseSome = () => {
    setStep('pick');
    if (!items.length) load();
  };

  const submitSome = () => {
    const list = [...selected.entries()].map(([id, name]) => ({ id, name }));
    onSubmit({ scope: list.length ? 'some' : 'none', items: list });
  };

  return (
    <Modal visible={!!group} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, step === 'pick' && s.sheetTall]}>
        {/* Mèo ngồi trên mép sheet — slot `sheet` (64×64) */}
        <MascotCat slot="sheet" size={64} style={s.cat} />
        <View style={s.handle} />

        {step === 'scope' ? (
          <>
            <Text style={s.title}>{emoji} {t('onboarding.allergyScope.question', { group: groupLabel.toLowerCase() })}</Text>
            <TouchableOpacity
              style={[s.option, initialScope === 'all' && s.optionOn]}
              onPress={() => onSubmit({ scope: 'all', items: [] })}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: initialScope === 'all' }}
            >
              <View style={[s.radio, initialScope === 'all' && s.radioOn]}>{initialScope === 'all' && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={s.optionTitle}>{t('onboarding.allergyScope.most', { group: groupLabel.toLowerCase() })}</Text>
                <Text style={s.optionDesc}>{t('onboarding.allergyScope.mostDesc')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.option, initialScope === 'some' && s.optionOn]}
              onPress={chooseSome}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: initialScope === 'some' }}
            >
              <View style={[s.radio, initialScope === 'some' && s.radioOn]}>{initialScope === 'some' && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={s.optionTitle}>{t('onboarding.allergyScope.some')}</Text>
                <Text style={s.optionDesc}>{t('onboarding.allergyScope.someDesc')}</Text>
              </View>
            </TouchableOpacity>
            {initialScope && (
              <TouchableOpacity onPress={() => onSubmit({ scope: 'none', items: [] })} style={s.remove}>
                <Text style={s.removeText}>{t('onboarding.allergyScope.remove')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <View style={s.pickHeader}>
              <TouchableOpacity onPress={() => setStep('scope')} hitSlop={10}>
                <Text style={s.back}>‹ {t('common.back')}</Text>
              </TouchableOpacity>
              <Text style={s.pickTitle} numberOfLines={1}>{emoji} {groupLabel}</Text>
              <View style={{ width: 60 }} />
            </View>
            <Text style={s.hint}>{t('onboarding.allergyScope.pickHint')}</Text>
            <TextInput
              style={s.search}
              placeholder={t('onboarding.allergyScope.search')}
              placeholderTextColor={C.textLight}
              value={query}
              onChangeText={setQuery}
            />
            {loading ? (
              <View style={s.center}><ActivityIndicator color={C.primary} /></View>
            ) : error ? (
              <View style={s.center}>
                <Text style={s.hint}>{t('onboarding.allergyScope.error')}</Text>
                <TouchableOpacity onPress={load}><Text style={s.back}>{t('common.retry')}</Text></TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(i) => String(i.id)}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={30}
                renderItem={({ item }) => {
                  const on = selected.has(item.id);
                  return (
                    <TouchableOpacity style={s.row} onPress={() => toggle(item)} activeOpacity={0.7}>
                      <CheckDot on={on} square />
                      <Text style={s.rowText}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={[s.hint, { textAlign: 'center', marginTop: 20 }]}>{t('onboarding.allergyScope.empty')}</Text>}
              />
            )}
            <PrimaryButton
              label={selected.size
                ? t('onboarding.allergyScope.done', { count: selected.size })
                : t('onboarding.allergyScope.doneNone')}
              onPress={submitSome}
              style={{ marginTop: 12 }}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(62,39,35,0.45)' },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 10,
  },
  sheetTall: { height: '82%' },
  cat: { position: 'absolute', right: 24, top: -40, zIndex: 2, elevation: 6 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#C9B9A8', marginBottom: 12 },
  title: { fontSize: F.lg + 2, color: C.text, fontFamily: 'Lora-Bold', marginTop: 4, marginBottom: 14, paddingRight: 72, lineHeight: 26 },
  option: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.border,
  },
  optionOn: { borderWidth: 2, borderColor: C.primary, backgroundColor: C.parchmentLight },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#A68F7E', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  optionTitle: { fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Bold' },
  optionDesc: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginTop: 3, lineHeight: 18 },
  remove: { alignItems: 'center', paddingTop: 8, minHeight: 40, justifyContent: 'center' },
  removeText: { color: C.textMid, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold', textDecorationLine: 'underline' },
  pickHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingRight: 72 },
  pickTitle: { fontSize: F.lg, color: C.text, fontFamily: 'Lora-Bold', flex: 1, textAlign: 'center' },
  back: { color: C.primary, fontSize: F.base, fontFamily: 'BeVietnamPro-SemiBold', width: 60 },
  hint: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginBottom: 8 },
  search: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: F.base, color: C.text, marginBottom: 8,
    fontFamily: 'BeVietnamPro-Regular',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowText: { fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Regular', flex: 1 },
});

export default AllergyScopeSheet;
