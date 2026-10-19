/**
 * 啟動色：app 喺主頁啟動，所以等於 HOME_THEME.bg（主頁漸變頂色，見 showThemes.ts）。
 * 獨立一個冇 import 嘅檔案，vite.config.ts（Node 環境）都 import 到，用嚟設 manifest
 * theme_color / background_color（Android 啟動畫面）；showThemes.ts 嘅 HOME_THEME.bg 都由呢度嚟。
 * index.html 嘅初始 <meta name="theme-color"> 要手動對齊，launchTheme.test.ts 會檢查。
 */
export const LAUNCH_THEME_COLOR = '#4f749c';
