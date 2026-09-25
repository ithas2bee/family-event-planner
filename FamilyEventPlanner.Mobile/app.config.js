const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        ...appJson.expo.android?.config,
        googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY },
      },
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
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
        },
      ],
    ],
  },
};