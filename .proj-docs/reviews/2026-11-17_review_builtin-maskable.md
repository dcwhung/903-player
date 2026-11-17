# Code Review — 2026-11-17 — 內建 Android maskable 圖示滿版（player 1.37.3 / admin 0.9.2）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/admin-player-fixes-6fzdtw` HEAD `4a31ca4`，`git diff 71c3d00..4a31ca4`（11 檔，+261 / −17）
- 涵蓋 commit：`190a843`（generateIcons maskable 滿版 + `iconLayout.mjs` + test + 重新生成兩張 PNG）、`4a31ca4`（player 1.37.3、admin 0.9.2 + CHANGELOG）
- Tier：T1（build script + 靜態 icon asset；冇 UI code / API / 新依賴）
- Review Item ID：**S-1102 – S-1103**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。冇三層收斂嘅 🔴 / 🟡；2 條 🟢

## Hard Gates

all pass

- Unit：`npx vitest run` `apps/player/scripts/generateIcons.test.ts` + `brandingIcons.test.ts` + admin `brandingModel` / `IconPreviews` / `iconRender` test → 5 files / 36 tests 全綠
- Type：`tsc -p tsconfig.scripts-test.json --noEmit`、`tsc -p tsconfig.node.json --noEmit`（`apps/player`）exit 0；Lint：`eslint apps/player/scripts` exit 0，改咗嘅檔 `prettier --check` 通過
- Coverage：`iconLayout.centerSquareCrop` 兩個分支（闊 / 高）都有 test；`generateIcons.mjs` 係一次性 script，由輸出 PNG 嘅像素 test 間接鎖住
- Security：冇新依賴（PNG decoder 用 `node:zlib`；`package-lock.json` 只改 version）
- E2E：CI run `44026617547`（head `4a31ca4`）success（Detect code changes、Lint, unit & build、E2E (Playwright) 全綠）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                         |
| -------- | ------- | ------- | -------------------------------------------- |
| 正確性   | 25      | 25      | 裁切框同 admin `centerCrop` 數學上相等       |
| 安全性   | 20      | 20      | 純 build-time 繪圖                           |
| 可維護性 | 20      | 20      | 底色 / 裁切抽去 `iconLayout.mjs`，有型別     |
| 測試覆蓋 | 15      | 15      | 新 test 對舊 PNG 會 fail（已驗）             |
| 性能     | 10      | 10      | maskable 512 由 171 KB → 262 KB，precache 內 |
| 代碼風格 | 10      | 10      |                                              |
| **總分** | **100** | **100** |                                              |

**結果：✅ pass**

## 驗證重點

- **裁切 = admin 預設框**：admin `cropGeometry.centerCrop(source, 512×512)` 喺正方形 target 時 `scale = 512 / min(w,h)`，`width = height = round(min)`，`x/y = round((w|h − side)/2)` —— 同 `centerSquareCrop` 一樣（唔止 502×499）。admin `iconSession.toReady` 開內建原圖時用嘅正係呢個框；`renderMaskable` 同 `iconRender.drawIcon` 一樣：`imageSmoothingQuality = 'high'`、先 `fillRect` 底色、`drawImage(crop → 0,0,size,size)`
- **可重現 + 其他 icon 冇變**：喺 sandbox 用 Chromium + ImageMagick（`convert`）重跑 `node scripts/generateIcons.mjs`，之後 `git status` 乾淨 —— 兩張 maskable byte-identical，`icon-192` / `icon-512` / `apple-touch-icon` / `favicon` / `og-icon.jpg` 都冇變
- **Regression test 有效**：舊版（`71c3d00`）兩張 maskable 喺四個 3% inset 取樣點全部 = `#98BDDE`，會 fail 新 test 嘅 `not.toBe(ICON_BACKGROUND)`；新版取樣點係原圖像素
- **PWA cache**：檔名冇變；`workbox.globPatterns` 包 `png`，precache revision 跟內容 hash 變，新 SW 會攞新圖；manifest 唔使改。已安裝嘅 Android WebAPK 要等 Chrome 下次 manifest 檢查先換 icon（正常行為，唔使處理）。admin 嗰張經 Vite import，URL 本身有 hash
- 自訂圖示路徑（`brandingIcons.ts` 覆蓋 `icon-maskable-512.png`）唔受影響
- Version bump player 1.37.3 / admin 0.9.2 + admin CHANGELOG Fixed ✅

## 🟢 Suggestion / Observation

- **S-1102** `generateIcons.test.ts` 取樣點對「滿版 vs 縮入」嘅分辨力好弱：原圖邊位顏色貼近底色（新圖 `(256,15)` = `#98BEE0`，同 `#98BDDE` 只差 1–2），`closeTo` 容差 12 下舊縮入版都會過，test 淨係靠 `not.toBe` 嘅精確比較撐住；換 Chromium 版本 smoothing 差少少就可能 flaky 或者假通過。建議取樣點改由原圖揀「同 `ICON_BACKGROUND` 每 channel 差 > 2 × 容差」嘅位（或者斷言取樣點同底色距離 > 容差），咁先真係量到圖畫到邊
- **S-1103** `centerSquareCrop` test 用 hardcode `{ x: 2, y: 0, 499 }` 代表 admin 預設框；可以直接 import `apps/admin/src/ui/cropGeometry.ts` 嘅 `centerCrop` 對幾個尺寸做 equality，admin 改咗 test 即刻紅

## ✅ 做得好嘅地方

- 由同一個 script 生成 player + admin 兩張，admin 唔再要手動同步副本
- 自寫 PNG decoder 細而完整（5 種 filter），唔加依賴；限制寫清楚（8-bit RGB/RGBA、non-interlaced）
- 註解寫明同 admin `drawIcon` / `BUILT_IN_ICON_BACKGROUND` 嘅對應

## Handoff receipt

```handoff-receipt
agent: code-reviewer
task: /review built-in Android maskable full-bleed (player 1.37.3, admin 0.9.2)
branch: claude/admin-player-fixes-6fzdtw
commit: 4a31ca4
report: .proj-docs/reviews/2026-11-17_review_builtin-maskable.md
score: 100
hard_gates:
  lint: pass
  type: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security: pass
status: pass
next_action: proceed_to_qa
findings:
  critical: 0
  warning: 0
  suggestion: 2 (S-1102, S-1103)
context: >
  All 🟢. Crop equals admin centerCrop for any square target; regenerated icons reproduce byte-identically, other
  icons unchanged. Per project rule, S-1102 (test sample points too close to background colour) and S-1103 (assert
  against admin centerCrop directly) should be fixed in this PR or a cleanup lane. E2E: CI run 44026617547 on 4a31ca4
  success (lint, unit, build, e2e all green). Report committed locally only, not pushed.
```
