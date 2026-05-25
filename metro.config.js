const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json', 'native.ts', 'native.tsx'];
config.resolver.resolverMainFields = ['sbmodern', 'browser', 'main', 'module'];

module.exports = config;
