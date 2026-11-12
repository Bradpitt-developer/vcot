const configuredUrl = String(process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

export const API_URL = configuredUrl || null;

/**
 * Preview mode is a development-only convenience. Live builds must set
 * EXPO_PUBLIC_API_URL so every data operation goes through the Express API.
 */
export const IS_DEMO = !API_URL && __DEV__;
export const APP_NAME = "Silai Saathi";
export const APP_VERSION = "1.0.0";
