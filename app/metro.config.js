// Metro varsayılan olarak sadece proje kökünü izliyor, app/ ../shared'i göremiyor.
// watchFolders'a ekleyince sözleşme tek kopya kalıyor.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../shared");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
