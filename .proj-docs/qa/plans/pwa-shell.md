# Test Plan — pwa-shell

- Chain: App 外殼：入口 / router、PWA service worker 換版（updateManager）、啟動畫面、版本號
- AC:
    - AC-1 有新版自己 reload 一次、播緊唔打斷、兩個 tab 都換（.tickets/completed/0001-0200/CUI-0017.md）
    - AC-2 Shift-reload 唔會卡喺舊版（S-648，.proj-docs/qa/2026-11-04_qa_s-648-hard-reload.md）
    - AC-3 啟動畫面顯示 package.json 版本、render 完移走；主頁橫額右下角顯示版本（README §功能）
- Scope files（24 個 + 1-hop importers 5 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/pwa/*` `src/splash/*` `src/main.tsx` `src/App.tsx` `src/App.test.tsx` `src/appVersion.d.ts` `src/config/appVersion*` `src/config/launchTheme*` `src/components/pages/home/AppVersion/*` `src/components/pages/home/ViewportDebug/*` `src/e2eSection.test.ts` `src/e2eSrcConstants.test.ts`
    - 1-hop importers: `src/config/showThemes.ts` `src/pages/home/{HomeStack.tsx,HomeWide.tsx}` `src/player/{playbackLog.test.ts,playbackLog.ts}`
- Commands:
    - npx vitest run src/components/pages/home/AppVersion/ src/components/pages/home/ViewportDebug/ src/config/appVersion.test.ts src/config/launchTheme.test.ts src/e2eSection.test.ts src/e2eSrcConstants.test.ts src/pwa/ src/splash/ src/App.test.tsx （12 個 test 檔）
    - e2e: e2e/pwaUpdate.mjs（PWA 換版 sections）
    - e2e: run.mjs '淺色主頁 + service worker'、'390×844 主流程'（splash / 版本號）
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: yes（scope 有 src/pwa/updateManager.ts、src/main.tsx 嘅 SW 註冊）
- Out of scope: vite.config.ts PWA manifest / workbox 設定（build config，唔屬 src）
