/**
 * 由 vite.config.ts 嘅 define 喺 build 時注入：同 manifest short_name 同一個值
 * （scripts/brandingConfig.ts manifestText：catalog branding 有設就跟，冇就 DEFAULT_APP_NAME）
 */
declare const __APP_SHORT_NAME__: string;
