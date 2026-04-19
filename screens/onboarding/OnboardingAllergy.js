import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingAllergy = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dị ứng & Kiêng kỵ</Text>
        <Text style={styles.description}>
          Vui lòng cho biết những thực phẩm bạn bị dị ứng hoặc kiêng để chúng tôi loại bỏ khỏi gợi ý.
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.continueButton}
        onPress={async () => {
          // Lưu flag onboarding đã hoàn tất
          await AsyncStorage.setItem('onboarding_done', 'true');
          // Dùng getParent() để navigate lên root Stack
          navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }}
      >
        <Text style={styles.continueButtonText}>Hoàn tất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingAllergy;