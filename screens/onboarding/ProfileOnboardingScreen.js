// screens/onboarding/ProfileOnboardingScreen.js
// Thêm thành viên mới: AddEditProfile (tên, quan hệ, avatar…) → 5 màn onboarding cho thành viên đó.
// Hồ sơ chỉ được tạo khi bấm "Bắt đầu" ở Màn 5 — thoát giữa chừng thì không tạo gì.
import React from 'react';
import { View } from 'react-native';
import OnboardingFlow from './OnboardingFlow';
import { C } from '../../theme';

const ProfileOnboardingScreen = ({ navigation, route }) => {
  const profileMeta = route?.params?.profileMeta || {};
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <OnboardingFlow
        mode="newProfile"
        profileMeta={profileMeta}
        onFinish={() => navigation.goBack()}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
};

export default ProfileOnboardingScreen;
