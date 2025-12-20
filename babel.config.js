module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      ['babel-plugin-react-compiler', { target: '19' }],
      require.resolve('expo-router/babel'),
      // Keep Reanimated last
      'react-native-reanimated/plugin',
    ],
  };
};
