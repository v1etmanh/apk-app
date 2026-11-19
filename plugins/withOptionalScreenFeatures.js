// Google Play infers android.hardware.screen.portrait as *required* when the
// activity is locked to portrait, which hides the app from tablets, desktop,
// and XR devices. Declare it as optional so prebuild keeps it in the manifest.
const { withAndroidManifest } = require('@expo/config-plugins');

const FEATURES = ['android.hardware.screen.portrait'];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
