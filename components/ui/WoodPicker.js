import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';

const WoodPicker = ({ selectedValue, onValueChange, items, placeholder }) => {
  const [visible, setVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const openPicker = () => {
    setVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const closePicker = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
  };

  const selectedItem = items.find(i => String(i.value) === String(selectedValue));
  const displayText = selectedItem ? selectedItem.label : (placeholder || 'Chọn');

  return (
    <>
      <TouchableOpacity style={st.triggerContainer} activeOpacity={0.7} onPress={openPicker}>
        <Text style={st.triggerText} numberOfLines={1}>{displayText}</Text>
        <Ionicons name="chevron-down" size={18} color={C.woodDark} />
      </TouchableOpacity>

      <Modal visible={visible} transparent={true} animationType="none" onRequestClose={closePicker}>
        <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closePicker} />
          
          <View style={st.sheet}>
            <View style={st.sheetHeader}>
              <Text style={st.sheetTitle}>{placeholder || 'Tùy chọn'}</Text>
              <TouchableOpacity onPress={closePicker} style={st.closeBtn}>
                <Ionicons name="close-circle" size={28} color={C.textMid} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
              {items.map((item, idx) => {
                // Ensure value comparison captures number/string types accurately
                const isSelected = String(item.value) === String(selectedValue);
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[st.optionItem, isSelected && st.optionSelected, idx !== items.length - 1 && st.optionBorder]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onValueChange(item.value);
                      closePicker();
                    }}
                  >
                    <Text style={[st.optionText, isSelected && st.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={C.accentGreen} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};

const st = StyleSheet.create({
  triggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg, // parchment
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    width: '100%',
  },
  triggerText: {
    fontFamily: 'PatrickHand_400Regular',
    fontSize: 18,
    color: C.text,
    flex: 1,
    marginRight: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(92, 58, 33, 0.4)', // dark wood 40%
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg, // modal bg parchment
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 34, // safe area padding
    shadowColor: C.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: C.borderLight,
  },
  sheetTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: C.text,
  },
  closeBtn: {
    padding: 0,
    opacity: 0.8,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderColor: C.borderLight,
  },
  optionSelected: {
    backgroundColor: C.parchmentDark,
  },
  optionText: {
    fontFamily: 'PatrickHand_400Regular',
    fontSize: 20,
    color: C.textMid,
  },
  optionTextSelected: {
    color: C.text,
    fontFamily: 'PatrickHand_400Regular',
  },
});

export default WoodPicker;
