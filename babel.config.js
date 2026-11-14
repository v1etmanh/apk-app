module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 / Worklets is configured automatically by babel-preset-expo.
  };
};
