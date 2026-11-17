// screens/onboarding/TasteOnboardingScreen.js
// Màn trong Main stack (mở từ banner ở Home): chạy phần khẩu vị của onboarding
// cho user cũ — Vùng miền → Flashcard → Xác nhận.
import React from 'react';
import { View } from 'react-native';
import OnboardingFlow from './OnboardingFlow';
import { C } from '../../theme';

const TasteOnboardingScreen = ({ navigation }) => (
  <View style={{ flex: 1, backgroundColor: C.bg }}>
    <OnboardingFlow
      mode="taste"
      onFinish={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  </View>
);

export default TasteOnboardingScreen;
