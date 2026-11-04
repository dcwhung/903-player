// Playwright Chromium 啟動路徑：cloud sandbox 預裝嘅 Chromium（例如 /opt/pw-browsers/chromium）
// 同 repo 鎖住嘅 Playwright 版本未必夾，set 咗 PW_CHROMIUM_PATH 就用佢，冇就由 Playwright 自己揀。
// e2e/run.mjs、scripts/generateIcons.mjs、scripts/arcCover/review/verify.cjs 共用。

/** 指定 Chromium 執行檔嘅環境變數名 */
export const CHROMIUM_PATH_ENV = 'PW_CHROMIUM_PATH';

/** 傳畀 chromium.launch({ executablePath }) ：冇 set（或者空字串）就係 undefined */
export const chromiumExecutablePath = () => process.env[CHROMIUM_PATH_ENV] || undefined;
