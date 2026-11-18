/**
 * ProfileSwitcherSheet.js
 * Bottom sheet chọn / switch profile — phong cách Ghibli (parchment + wood)
 * Dùng: <ProfileSwitcherSheet visible={bool} onClose={fn} onAddNew={fn} />
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { C } from '../theme';
import { useTranslation } from 'react-i18next';
import ProfileAvatar, { useProfileYear } from './ui/ProfileAvatar';
import { getProfileAge, MAX_FAMILY_MEMBERS } from '../utils/profileIdentity';

const { height: SH } = Dimensions.get('window');
const ASSETS = { paper: require('../assets/textures/paper_cream.png') };

const ProfileSwitcherSheet = ({ visible, onClose, onAddNew }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const { profiles, activeProfileId, switchProfile, loadAllProfilesAction } = useAppStore();
  const year = useProfileYear();
  const atCapacity = profiles.length >= MAX_FAMILY_MEMBERS;

  useEffect(() => {
    if (visible) {
      loadAllProfilesAction();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,  duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSwitch = async (profileId) => {
    if (profileId === activeProfileId) { onClose(); return; }
    await switchProfile(profileId);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[st.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[st.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Paper texture */}
        <Image source={ASSETS.paper} style={[StyleSheet.absoluteFill, { borderRadius: 24, opacity: 0.6 }]} resizeMode="cover" />

        {/* Handle */}
        <View style={st.handle} />

        {/* Title */}
        <Text style={st.title}>{t('profiles.choose')}</Text>
        <Text style={st.profileRelation}>{t('familyAvatar.capacity', { count: profiles.length, max: MAX_FAMILY_MEMBERS })}</Text>

        {/* Profile list */}
        <ScrollView style={st.list} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {profiles.length === 0 ? (
            <View style={st.emptyRow}>
              <Text style={st.emptyText}>{t('profiles.empty')}</Text>
            </View>
          ) : profiles.map((p) => {
            const isActive = p.profileId === activeProfileId;
            const age = getProfileAge(p, year);
            return (
              <TouchableOpacity
                key={p.profileId}
                style={[st.profileRow, isActive && st.profileRowActive]}
                activeOpacity={0.75}
                onPress={() => handleSwitch(p.profileId)}
              >
                {/* Avatar */}
                <View style={[st.avatarCircle, isActive && st.avatarCircleActive]}>
                  <ProfileAvatar profile={p} size={44} animated={isActive} visible={visible} />
                </View>

                {/* Info */}
                <View style={st.profileInfo}>
                  <Text style={[st.profileName, isActive && st.profileNameActive]} numberOfLines={1}>
                    {p.displayName || t('profiles.unnamed')}
                  </Text>
                  <Text style={st.profileRelation}>
                    {t(`profiles.${p.relation}`, { defaultValue: t('profiles.other') })}
                    {age !== null ? ` · ${t('profiles.years', { count: age })}` : ''}
                  </Text>
                </View>

                {/* Checkmark / Active badge */}
                {isActive ? (
                  <View style={st.activeBadge}>
                    <Text style={st.activeBadgeText}>{t('profiles.active')}</Text>
                  </View>
                ) : (
                  <View style={st.arrowWrap}>
                    <Text style={st.arrowText}>›</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Divider */}
        <View style={st.divider} />

        {/* Add new button */}
        <TouchableOpacity style={[st.addBtn, atCapacity && { opacity: 0.5 }]} disabled={atCapacity} activeOpacity={0.8} onPress={() => { onClose(); onAddNew?.(); }}>
          <Text style={st.addBtnIcon}>＋</Text>
          <Text style={st.addBtnText}>{t('profiles.add')}</Text>
        </TouchableOpacity>
        {atCapacity && <Text style={st.profileRelation}>{t('familyAvatar.limitBody')}</Text>}
      </Animated.View>
    </Modal>
  );
};

const st = StyleSheet.create({
  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30,15,5,0.55)',
  },

  // Sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5EDDC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#C8A96E',
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: SH * 0.72,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 18,
  },

  // Handle
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#C8A96E',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },

  // Title
  title: {
    fontFamily: 'Lora-Bold',
    fontSize: 18,
    color: C.text,
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  // List
  list: { flexGrow: 0 },

  emptyRow: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: C.textLight },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  profileRowActive: {
    backgroundColor: 'rgba(200,169,110,0.18)',
    borderColor: '#C8A96E',
  },

  // Avatar
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,110,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleActive: { borderColor: '#C8A96E', borderWidth: 2 },

  // Profile info
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: C.text,
    marginBottom: 2,
  },
  profileNameActive: { color: C.primary },
  profileRelation: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 12,
    color: C.textLight,
  },

  // Active badge
  activeBadge: {
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 11,
    color: '#FFF8EA',
  },

  // Arrow
  arrowWrap: { paddingHorizontal: 8 },
  arrowText: { fontSize: 22, color: C.textLight },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(200,169,110,0.35)',
    marginVertical: 12,
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    borderStyle: 'dashed',
    gap: 8,
  },
  addBtnIcon: {
    fontSize: 20,
    color: C.primary,
    lineHeight: 24,
  },
  addBtnText: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: C.primary,
  },
});

export default ProfileSwitcherSheet;
