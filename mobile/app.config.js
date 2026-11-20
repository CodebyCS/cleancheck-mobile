const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE !== 'preview-local') return config;
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    return modConfig;
  });
};
