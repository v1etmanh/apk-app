module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: react-native-reanimated/plugin KHÔNG dùng với New Architecture (SDK 54 / RN 0.76)
    // New Architecture xử lý Reanimated natively — plugin này sẽ gây lỗi nếu để lại
  };
};
