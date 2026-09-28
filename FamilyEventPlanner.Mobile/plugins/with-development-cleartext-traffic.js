const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDevelopmentCleartextTraffic(config, { enabled }) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (application) {
      application.$['android:usesCleartextTraffic'] = enabled ? 'true' : 'false';
    }

    return config;
  });
};
