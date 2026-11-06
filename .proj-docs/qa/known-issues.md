# Known Issues（QA 已知失敗登記）

> 規則見 ai-dev-team `skills/sw-validation-gate/SKILL.md` §6：遇到已登記嘅 KI 唔計 fail，報告寫一行引用；新出現嘅環境 / harness 失敗加一行 KI，唔使開 CUI ticket。

| KI     | Test / 症狀                                                                                                               | 原因                                                                                         | 狀態                                        | 首次記錄   |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------- |
| KI-001 | `src/pages/HomePageWide.test.tsx`「should play on the first tap of 播放 right after a swipe changed show」全 suite 偶然紅 | Test flake（冷 cache，未重現到；`.tickets/completed/0001-0200/CUI-0016.md`），產品行為冇問題 | closed（2026-11-06 用戶決定：再出現先重開） | 2026-10-30 |
