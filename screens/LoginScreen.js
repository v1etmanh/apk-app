/**
 * LoginScreen.js — Ghibli Handcrafted Style
 * Features: Email/Password login, Register, Google OAuth, Forgot Password
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Image, Alert,
} from 'react-native';
import { supabase } from '../store/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';

WebBrowser.maybeCompleteAuthSession();

// ── Texture assets (đường dẫn theo project của bạn) ──────────────────────────
const TEX = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// ── Mode: 'login' | 'register' | 'forgot' ────────────────────────────────────
export default function LoginScreen() {
  const { t } = useTranslation();
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  // [FIX ID-M016] Chống double-submit — ref thay state để tránh race condition trước React re-render
  const isSubmittingRef = useRef(false);

  // [FIX ID-M009] Email format validator (regex đơn giản — đủ để UX feedback trước khi gọi Supabase)
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ── Animation helpers ──────────────────────────────────────────────────────
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    // [FIX ID-M016] Chống double-submit
    if (isSubmittingRef.current) return;
    if (!email || !password) { shake(); return; }
    // [FIX ID-M009] Validate email format trước khi gọi server
    if (!isValidEmail(email)) { Alert.alert(t('auth.emailInvalid'), t('auth.emailInvalidBody')); shake(); return; }
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert(t('auth.login'), friendlyError(error.message, t));
        shake();
      }
      // Nếu thành công, onAuthStateChange trong App.js sẽ tự chuyển màn hình
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleRegister = async () => {
    // [FIX ID-M016] Chống double-submit
    if (isSubmittingRef.current) return;
    if (!email || !password || !confirm) { shake(); return; }
    // [FIX ID-M009] Validate email format
    if (!isValidEmail(email)) { Alert.alert(t('auth.emailInvalid'), t('auth.emailInvalidBody')); shake(); return; }
    if (password !== confirm) {
      Alert.alert(t('auth.passwordMismatch'), t('auth.passwordMismatchBody'));
      shake(); return;
    }
    // [AUD-010] Min 8 ký tự — phù hợp app lưu dữ liệu sức khỏe cá nhân
    if (password.length < 8) {
      Alert.alert(t('auth.passwordShort'), t('auth.passwordShortBody'));
      shake(); return;
    }
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert(t('auth.register'), friendlyError(error.message, t));
        shake();
      } else {
        Alert.alert(
          t('auth.register'),
          t('auth.sendReset'),
          [{ text: t('common.ok'), onPress: () => setMode('login') }]
        );
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleForgot = async () => {
    if (!email) { shake(); return; }
    setLoading(true);
    // Dùng Linking.createURL thay vì hardcode scheme
    // Expo Go tunnel → exp://dasmg0-concop17-8081.exp.direct/--/reset-password
    // Standalone build → dailymate://reset-password
    const resetRedirect = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirect,
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), friendlyError(error.message, t));
    } else {
      Alert.alert(
        t('auth.sendReset'),
        t('auth.sendReset'),
        [{ text: t('common.ok'), onPress: () => setMode('login') }]
      );
    }
  };

  const handleGoogle = async () => {
    try {
      // [FIX] Dùng Linking.createURL thay vì makeRedirectUri({ native: ... })
      // APK standalone → dailymate:///   (khớp intentFilter scheme="dailymate" trong app.json)
      // Expo Go        → exp://IP:PORT/--/   (khớp exp://*/** trong Supabase)
      // KHÔNG dùng com.anonymous.dailymate:// — đó là package ID, không phải URL scheme
      const redirectUrl = Linking.createURL('/');
      if (__DEV__) console.log('[Google OAuth] redirectUrl:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (error) { Alert.alert(t('common.error'), error.message); return; }
      if (!data?.url) { Alert.alert(t('common.error'), t('auth.googleUrlError')); return; }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        { showInRecents: true }
      );

      if (result.type === 'success' && result.url) {
        // iOS: Custom Tab trả về URL trực tiếp → xử lý ở đây
        // Android APK: Chrome Custom Tab close + app nhận deep link qua Linking
        //              → handleDeepLink trong App.js đã lo, nhưng vẫn xử lý ở đây để an toàn
        const urlStr = result.url;
        const queryStr = urlStr.split('#')[1] ?? urlStr.split('?')[1] ?? '';
        const params   = new URLSearchParams(queryStr);
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const code         = params.get('code');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) Alert.alert(t('common.error'), sessionError.message);
        } else if (code) {
          // PKCE flow — Android thường dùng flow này
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(urlStr);
          if (codeError) Alert.alert(t('common.error'), codeError.message);
        }
        // onAuthStateChange trong App.js tự chuyển màn hình khi session ready
      }
      // type === 'cancel'/'dismiss': Android đóng tab để mở app qua deep link
      // → App.js handleDeepLink sẽ xử lý — không cần alert ở đây
      if (__DEV__ && result.type !== 'success') {
        console.log('[Google OAuth] WebBrowser result:', result.type, '— chờ deep link từ Android...');
      }
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('auth.unknownError'));
    }
  };

  const submit = mode === 'login' ? handleLogin
               : mode === 'register' ? handleRegister
               : handleForgot;

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const TITLES = {
    login:    { emoji: '🍳', title: t('auth.loginTitle'),    sub: t('auth.loginSubtitle') },
    register: { emoji: '🌿', title: t('auth.registerTitle'),    sub: t('auth.registerSubtitle') },
    forgot:   { emoji: '🔑', title: t('auth.forgotTitle'),  sub: t('auth.forgotSubtitle') },
  };
  const { emoji, title, sub } = TITLES[mode];

  return (
    <View style={s.root}>
      {/* Layer 1 — wood background */}
      <Image source={TEX.wood} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.82 }]} resizeMode="cover" />
      {/* Layer 2 — cream overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(240,230,210,0.45)' }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot */}
          <View style={s.mascotRow}>
            <Text style={s.mascotEmoji}>🐱</Text>
            <View style={s.mascotBubble}>
              <Text style={s.mascotText}>
                {mode === 'login'    ? t('auth.loginSubtitle')
                : mode === 'register' ? t('auth.registerSubtitle')
                :                       t('auth.forgotSubtitle')}
              </Text>
            </View>
          </View>

          {/* Card chính */}
          <Animated.View style={[s.cardShadow, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={s.card}>
              {/* Paper texture */}
              <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]} pointerEvents="none">
                <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>

              <View style={{ zIndex: 1 }}>
                {/* Header */}
                <Text style={s.emoji}>{emoji}</Text>
                <Text style={s.title}>{title}</Text>
                <Text style={s.sub}>{sub}</Text>

                <View style={s.divider} />

                {/* Email input */}
                <Text style={s.label}>{t('auth.email')}</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="hello@example.com"
                    placeholderTextColor="#C8A96E"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password input */}
                {mode !== 'forgot' && (
                  <>
                    <Text style={s.label}>{t('auth.password')}</Text>
                    <View style={s.inputWrap}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="••••••••"
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
                  </>
                )}

                {/* Confirm password (register only) */}
                {mode === 'register' && (
                  <>
                    <Text style={s.label}>{t('auth.confirmPassword')}</Text>
                    <View style={s.inputWrap}>
                      <TextInput
                        style={s.input}
                        placeholder="••••••••"
                        placeholderTextColor="#C8A96E"
                        value={confirm}
                        onChangeText={setConfirm}
                        secureTextEntry={!showPass}
                        autoCapitalize="none"
                      />
                    </View>
                  </>
                )}

                {/* Forgot password link */}
                {mode === 'login' && (
                  <TouchableOpacity onPress={() => setMode('forgot')} style={s.forgotBtn}>
                    <Text style={s.forgotText}>{t('auth.forgotPassword')}</Text>
                  </TouchableOpacity>
                )}

                {/* CTA Button */}
                <View style={s.ctaShadow}>
                  <TouchableOpacity style={s.ctaBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
                      <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.4 }} resizeMode="cover" />
                    </View>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.ctaText}>
                          {mode === 'login' ? `🍳 ${t('auth.login')}`
                          : mode === 'register' ? `🌿 ${t('auth.registerTitle')}`
                          : `📬 ${t('auth.sendReset')}`}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* Google button */}
                {mode !== 'forgot' && (
                  <>
                    <View style={s.orRow}>
                      <View style={s.orLine} />
                      <Text style={s.orText}>{t('auth.or')}</Text>
                      <View style={s.orLine} />
                    </View>

                    <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
                      <Text style={s.googleIcon}>🌐</Text>
                      <Text style={s.googleText}>{t('auth.continueGoogle')}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Switch mode */}
                <View style={s.switchRow}>
                  {mode === 'login' && (
                    <>
                      <Text style={s.switchText}>{t('auth.noAccount')}</Text>
                      <TouchableOpacity onPress={() => setMode('register')}>
                        <Text style={s.switchLink}>{t('auth.registerNow')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {mode === 'register' && (
                    <>
                      <Text style={s.switchText}>{t('auth.haveAccount')}</Text>
                      <TouchableOpacity onPress={() => setMode('login')}>
                        <Text style={s.switchLink}>{t('auth.login')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {mode === 'forgot' && (
                    <TouchableOpacity onPress={() => setMode('login')}>
                      <Text style={s.switchLink}>{t('auth.backToLogin')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={s.footer}>{t('auth.companion')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function friendlyError(msg = '', t = (key) => key) {
  if (msg.includes('Invalid login'))        return t('auth.emailInvalidBody');
  if (msg.includes('Email not confirmed'))  return t('auth.loginSubtitle');
  if (msg.includes('already registered'))   return t('auth.emailInvalidBody');
  if (msg.includes('Network'))              return t('auth.unknownError');
  return msg;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#8B5E3C',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // Mascot
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  mascotEmoji: { fontSize: 52, marginBottom: -4 },
  mascotBubble: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    backgroundColor: 'rgba(245,237,220,0.92)',
  },
  mascotText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: '#4A3728',
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
  },

  // Card
  cardShadow: {
    borderRadius: 24,
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#F5EDDC',
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#C8A96E',
  },

  // Header
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  title: {
    fontFamily: 'Lora-Bold',
    fontSize: 26,
    color: '#3D2B1F',
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 23,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#C8A96E',
    opacity: 0.5,
    marginVertical: 20,
    borderRadius: 1,
  },

  // Inputs
  label: {
    fontFamily: 'BeVietnamPro-Bold',
    fontSize: 15,
    color: '#5C4A38',
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,240,0.7)',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  input: {
    flex: 1,
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: '#3D2B1F',
  },
  eyeBtn: { paddingLeft: 8 },
  eyeIcon: { fontSize: 18 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginTop: 6 },
  forgotText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: '#60A5FA',
    textDecorationLine: 'underline',
  },

  // CTA
  ctaShadow: {
    marginTop: 24,
    borderRadius: 20,
    shadowColor: '#60A5FA',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaBtn: {
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#60A5FA',
    borderWidth: 2,
    borderColor: '#3B82F6',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Lora-Bold',
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    zIndex: 1,
  },

  // OR divider
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: '#C8A96E', opacity: 0.5 },
  orText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: '#8B7355',
    marginHorizontal: 10,
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    borderRadius: 20,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,240,0.7)',
    gap: 8,
  },
  googleIcon: { fontSize: 20 },
  googleText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 16,
    color: '#5C4A38',
  },

  // Switch mode
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  switchText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 14,
    color: '#8B7355',
  },
  switchLink: {
    fontFamily: 'Lora-SemiBold',
    fontSize: 14,
    color: '#60A5FA',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: 'rgba(245,237,220,0.7)',
    textAlign: 'center',
    marginTop: 24,
  },
});
