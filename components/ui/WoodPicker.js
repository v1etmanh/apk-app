import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';

const FlagMark = ({ code }) => {
  if (!code) return null;

  if (code === 'GLOBAL') {
    return (
      <View style={[st.flagBase, st.flagGlobal]}>
        <Ionicons name="earth" size={12} color="#FFFFFF" />
      </View>
    );
  }

  if (code === 'VN') {
    return (
      <View style={[st.flagBase, st.flagVN]}>
        <Text style={st.flagSymbol}>★</Text>
      </View>
    );
  }

  if (code === 'JP') {
    return (
      <View style={[st.flagBase, st.flagJP]}>
        <View style={st.flagJPDot} />
      </View>
    );
  }

  if (code === 'TH') {
    return (
      <View style={[st.flagBase, st.flagFrame]}>
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C73B3B' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#FFFFFF' }]} />
        <View style={[st.flagStripe, { flex: 2, backgroundColor: '#243C8F' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#FFFFFF' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C73B3B' }]} />
      </View>
    );
  }

  if (code === 'IT') {
    return (
      <View style={[st.flagBase, st.flagFrame, st.flagVertical]}>
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#2F8F46' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#F7F4EA' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C94646' }]} />
      </View>
    );
  }

  if (code === 'KR') {
    return (
      <View style={[st.flagBase, st.flagJP]}>
        <View style={st.flagKRCircle}>
          <View style={st.flagKRTop} />
          <View style={st.flagKRBottom} />
        </View>
      </View>
    );
  }

  if (code === 'US') {
    return (
      <View style={[st.flagBase, st.flagFrame]}>
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C94646' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#F7F4EA' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C94646' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#F7F4EA' }]} />
        <View style={[st.flagStripe, { flex: 1, backgroundColor: '#C94646' }]} />
        <View style={st.flagCanton} />
      </View>
    );
  }

  return (
    <View style={[st.flagBase, st.flagFallback]}>
      <Text style={st.flagFallbackText}>{code}</Text>
    </View>
  );
};

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
        {selectedItem?.flagCode ? <FlagMark code={selectedItem.flagCode} /> : null}
        <Text style={[st.triggerText, selectedItem?.flagCode && st.textWithFlag]} numberOfLines={1}>{displayText}</Text>
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
                    <View style={st.optionMain}>
                      {item.flagCode ? <FlagMark code={item.flagCode} /> : null}
                      <Text style={[st.optionText, item.flagCode && st.textWithFlag, isSelected && st.optionTextSelected]}>
                        {item.label}
                      </Text>
                    </View>
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
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: C.text,
    flex: 1,
    marginRight: 6,
  },
  textWithFlag: {
    marginLeft: 10,
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
  optionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderColor: C.borderLight,
  },
  optionSelected: {
    backgroundColor: C.parchmentDark,
  },
  optionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: C.textMid,
    flexShrink: 1,
  },
  optionTextSelected: {
    color: C.text,
    fontFamily: 'Nunito_700Bold',
  },
  flagBase: {
    width: 26,
    height: 18,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92,58,33,0.10)',
    flexShrink: 0,
  },
  flagFrame: {
    backgroundColor: '#FFFFFF',
  },
  flagVertical: {
    flexDirection: 'row',
  },
  flagStripe: {
    width: '100%',
  },
  flagGlobal: {
    backgroundColor: C.accentBlue,
  },
  flagVN: {
    backgroundColor: '#C53B2B',
  },
  flagJP: {
    backgroundColor: '#F8F6F1',
  },
  flagJPDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#C94646',
  },
  flagKRCircle: {
    width: 10,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    transform: [{ rotate: '-28deg' }],
  },
  flagKRTop: {
    flex: 1,
    backgroundColor: '#D24B4B',
  },
  flagKRBottom: {
    flex: 1,
    backgroundColor: '#3259B7',
  },
  flagCanton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderTopLeftRadius: 5,
    backgroundColor: '#28458F',
  },
  flagFallback: {
    backgroundColor: C.woodLight,
  },
  flagFallbackText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 8,
    color: '#FFFFFF',
  },
  flagSymbol: {
    color: '#F7CE46',
    fontSize: 9,
    lineHeight: 10,
    marginTop: -1,
  },
});

export default WoodPicker;
