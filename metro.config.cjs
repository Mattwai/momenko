const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  crypto: require.resolve('crypto-browserify'),
  process: require.resolve('process/browser'),
  util: require.resolve('util'),
  events: require.resolve('events/'),
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  zlib: require.resolve('browserify-zlib'),
  assert: require.resolve('assert'),
  url: require.resolve('url/'),
  ws: require.resolve('./stubs/ws.js'),
};

// Exclude ws and @supabase/realtime-js from being bundled
// This prevents Metro from trying to bundle Node-only modules
// and fixes the "net" import error in Expo/React Native

defaultConfig.resolver.blockList = exclusionList([
  /node_modules\/ws\/.*/,
]);

module.exports = defaultConfig; 