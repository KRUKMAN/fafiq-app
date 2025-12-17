module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      require.resolve('expo-router/babel'),
      // Keep Reanimated last
      'react-native-reanimated/plugin',
    ],
  };
};
