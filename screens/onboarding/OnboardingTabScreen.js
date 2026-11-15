// screens/onboarding/OnboardingTabScreen.js
// Tab "Khẩu vị" ở thanh dưới: chạy lại toàn bộ 5 màn onboarding bất cứ lúc nào.
// Làm xong → lưu hồ sơ, quay về Home và reset luồng để lần sau bắt đầu lại từ Màn 1.
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import OnboardingFlow from './OnboardingFlow';
import { C } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

const OnboardingTabScreen = ({ navigation }) => {
  const [runId, setRunId] = useState(0);
  // Đổi hồ sơ đang chọn → nạp lại luồng với dữ liệu của hồ sơ đó
  const activeProfileId = useAppStore(st => st.activeProfileId);

  const handleFinish = useCallback(() => {
    setRunId(id => id + 1);   // remount → nháp mới, bắt đầu lại từ Màn 1
    navigation.navigate('Home');
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <OnboardingFlow key={`${activeProfileId}-${runId}`} mode="full" onFinish={handleFinish} />
    </View>
  );
};

export default OnboardingTabScreen;
