const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      package: 'com.huddleup.familyeventplanner',
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        ...appJson.expo.ios?.config,
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
      },
    },
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
        },
      ],
      '@maplibre/maplibre-react-native',
      [
        './plugins/with-development-cleartext-traffic',
        { enabled: process.env.EAS_BUILD_PROFILE !== 'production' },
      ],
    ],
  },
};