import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Silai Saathi",
  slug: "silai-saathi",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: "silaisaathi",
  icon: "./assets/icon.png",
  plugins: ["expo-sharing", "expo-mail-composer"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.silaisaathi.app",
  },
  android: {
    package: "com.silaisaathi.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#128C7E",
    },
    permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
});
