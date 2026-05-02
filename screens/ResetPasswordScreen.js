/**
 * ResetPasswordScreen.js — Ghibli Handcrafted Style
 * Hiển thị sau khi user bấm link reset password trong email
 * Deep link: dailymate://reset-password?access_token=...
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Image, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../store/suppabase';

const TEX = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleReset = async () => {
    if (!password || !confirm) { shake(); return; }
    if (password !== confirm) {
      Alert.alert('Mật khẩu không khớp 😿', 'Nhập lại mật khẩu xác nhận nhé!');
      shake(); return;
    }
    if (password.length < 6) {
      Alert.alert('Mật khẩu quá ngắn 😿', 'Cần ít nhất 6 ký tự!');
      shake(); return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Đổi mật khẩu thất bại 😿', error.message);
      shake();
    } else {
      Alert.alert(
        'Thành công! 🎉',
        'Mật khẩu đã được cập nhật. Đăng nhập lại nhé!',
        [{
          text: 'OK',
          onPress: async () => {
            await supabase.auth.signOut();
            onDone?.(); // ẩn màn hình reset, App.js tự chuyển về Login
          },
        }]
      );
    }
  };

  return (
    <View style={s.root}>
      <Image source={TEX.wood} style={[StyleSheet.absoluteFillObject, { opacity: 0.82 }]} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(240,230,210,0.45)' }]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Mascot */}
          <View style={s.mascotRow}>
            <Text style={s.mascotEmoji}>🐱</Text>
            <View style={s.mascotBubble}>
              <Text style={s.mascotText}>Đặt mật khẩu mới cho mày nào! 🔐</Text>
            </View>
          </View>

          {/* Card */}
          <Animated.View style={[s.cardShadow, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={s.card}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]} pointerEvents="none">
                <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>

              <View style={{ zIndex: 1 }}>
                <Text style={s.emoji}>🔑</Text>
                <Text style={s.title}>Đặt mật khẩu mới</Text>
                <Text style={s.sub}>Nhập mật khẩu mới cho tài khoản của bạn</Text>

                <View style={s.divider} />

                {/* Password mới */}
                <Text style={s.label}>🔒 Mật khẩu mới</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#C8A96E"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                    <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Xác nhận */}
                <Text style={s.label}>🔒 Xác nhận mật khẩu</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="#C8A96E"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                  />
                </View>

                {/* CTA */}
                <View style={s.ctaShadow}>
                  <TouchableOpacity style={s.ctaBtn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
                      <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.4 }} resizeMode="cover" />
                    </View>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.ctaText}>🔐 Cập nhật mật khẩu</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          <Text style={s.footer}>🍜 Daily Mate — Bạn đồng hành ẩm thực</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8B5E3C' },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 40,
  },
  mascotRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginBottom: 16, paddingHorizontal: 4,
  },
  mascotEmoji: { fontSize: 52, marginBottom: -4 },
  mascotBubble: {
    flex: 1, marginLeft: 10, marginBottom: 10,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#C8A96E',
    backgroundColor: 'rgba(245,237,220,0.92)',
  },
  mascotText: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 15,
    color: '#4A3728', lineHeight: 22, flexShrink: 1, flexWrap: 'wrap',
  },
  cardShadow: {
    borderRadius: 24, shadowColor: '#8B5E3C',
    shadowOpacity: 0.22, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  card: {
    borderRadius: 24, backgroundColor: '#F5EDDC',
    padding: 24, borderWidth: 1.5, borderColor: '#C8A96E',
  },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  title: {
    fontFamily: 'Lora-Bold', fontSize: 26,
    color: '#3D2B1F', textAlign: 'center', marginBottom: 6,
  },
  sub: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 15,
    color: '#8B7355', textAlign: 'center', lineHeight: 23,
  },
  divider: {
    height: 1.5, backgroundColor: '#C8A96E',
    opacity: 0.5, marginVertical: 20, borderRadius: 1,
  },
  label: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 15,
    color: '#5C4A38', marginBottom: 6, marginTop: 12,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#C8A96E', borderRadius: 14,
    backgroundColor: 'rgba(255,255,240,0.7)',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  input: {
    flex: 1, fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15, color: '#3D2B1F',
  },
  eyeBtn: { paddingLeft: 8 },
  eyeIcon: { fontSize: 18 },
  ctaShadow: {
    marginTop: 24, borderRadius: 20,
    shadowColor: '#60A5FA', shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  ctaBtn: {
    borderRadius: 20, paddingVertical: 15, alignItems: 'center',
    backgroundColor: '#60A5FA', borderWidth: 2, borderColor: '#3B82F6',
    flexDirection: 'row', justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Lora-Bold', fontSize: 18,
    color: '#fff', fontWeight: '700', zIndex: 1,
  },
  footer: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 13,
    color: 'rgba(245,237,220,0.7)', textAlign: 'center', marginTop: 24,
  },
});
