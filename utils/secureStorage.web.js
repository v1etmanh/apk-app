import AsyncStorage from '@react-native-async-storage/async-storage';

export const getItemAsync = (key) => AsyncStorage.getItem(key);
export const setItemAsync = (key, value) => AsyncStorage.setItem(key, value);
export const deleteItemAsync = (key) => AsyncStorage.removeItem(key);
