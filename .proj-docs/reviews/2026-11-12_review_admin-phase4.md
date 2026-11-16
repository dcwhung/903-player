# Code Review — Lane L2：admin 0.1.0（Phase 4）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/admin-phase4` @ `c4edfd4`，`git diff $(git merge-base HEAD origin/main)..HEAD -- apps/admin`（6 commits：59d29a4、09e6e4d、c89f79b、3c91410、8386214、c4edfd4；92 files，+5372 / −651）
- 規格：`.proj-docs/plans/2026-11-12_plan_phase4-5.md`「L2：admin 0.1.0」；mockup `_mockups_/admin-phase4/index.html`（Q1–Q17）；`apps/api/README.md`「首頁 banner + R2 原圖（Phase 4）」；S-893、S-891；backlog S-805 / S-816 / S-817
- Tier：T2（MINOR，新功能跨 admin 多個 feature）
- 總評：功能齊、結構清楚，純 function（`cropGeometry`、`imageHeader`、`palette`、`r2AutoCrop`、`warningModel`）test 扎實。R2 自動裁切嘅重複觸發（attempted ref + StrictMode test）、404 / null / 422 略過、412 重讀再試、8000 px（decode 前讀檔頭）/ 20 MB / `ASSET_MAX_BYTES`、theme 欄位保留、Banner 兩步取消唔寫、Motion 規則都啱。冇 🔴；3 條 🟡 集中喺 test 質素同 publish 頁錯誤狀態

## Hard Gates

all pass。

- `npx eslint apps/admin`：exit 0；`npx prettier --check apps/admin _mockups_/admin-phase4`：exit 0；`npx tsc -b apps/admin`：exit 0
- 相關 unit test：`npx vitest run <21 個改動 test 檔>`（cwd `apps/admin`）→ 21 files / 140 tests pass
- Coverage（只量改動核心檔）：`r2AutoCrop` 100%、`useR2AutoCrop` 100%、`cropGeometry` 100%、`palette` 98.8%、`imageCrop` 91.5%、`imageHeader` 96.8%、`warningModel` 100%、`model/theme` 100%、`useEntryEditor` 81.8%（lines）；`useCropDrag` 46%、`useModalKeys` 63%（見 W-725）
- Security：冇新增依賴（`@jsquash/webp` 已存在）；R2 key 白名單喺 api；圖 URL 經 `encodeURIComponent`
- 冇跑 full suite 同 e2e（Hard Rule #7，屬 QA / CI）
- Version bump：`apps/admin` 0.0.2 → 0.1.0 + `CHANGELOG.md`

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                               |
| -------- | ------ | ------- | ------------------------------------------------------------------ |
| 正確性   | 20     | 25      | W-726：publish 錯誤狀態同 mockup #f 唔一致                         |
| 安全性   | 20     | 20      | 冇新依賴；r2-source 由 api 白名單                                  |
| 可維護性 | 20     | 20      | 純 function 抽得好；🟢 只係重複常數 / 死 hook                      |
| 測試覆蓋 | 5      | 15      | W-724 S-817 test 拆走 guard 都照 pass；W-725 412 重試、拖框冇 test |
| 性能     | 10     | 10      | 逐個 slot decode、預覽 canvas 上限 480 px；🟢 S-910                |
| 代碼風格 | 10     | 10      | lint / prettier 全過；lucide icon、token、Motion 跟規則            |
| **總分** | **85** | **100** | **結果：⚠️ warn**                                                  |

## 🟡 Warning

### W-724 `apps/admin/src/ui/ImageSlot.test.tsx:123`：S-817「上載中 Esc 唔收 dialog」test 係空殼

- L1：plan L2 §1「S-817：上載中 Esc 唔收 dialog」；CHANGELOG 0.1.0 Changed 第 2 點
- L2：暫時將 `useModalKeys.ts:321`、`:331` 嘅 `!locked` 拆走 → `npx vitest run src/ui/ImageSlot.test.tsx -t "Esc while uploading"` 仍然 `1 passed`（跑完已 `git checkout` 還原）。Probe：busy 時 `document.activeElement` = disabled 嘅「上載中…」掣，`userEvent.tab()` 之後都仲喺度
- L3：撳「上載」之後 focus 留喺變咗 disabled 嘅掣，user-event 唔會喺 disabled 元素派 keydown，scrim 嘅 `onKeyDown` 根本收唔到 Esc，test 冇驗到 guard。真 browser 入面 focus 亦可能跌出 dialog（Tab 走出 modal）
- 方案 A：busy 時 focus 移去 dialog 本身（`dialogRef.focus()`，同載入中做法一樣），test 斷言 `activeElement` 喺 dialog 入面再撳 Esc。方案 B：test 直接 `fireEvent.keyDown(dialog, { key: 'Escape' })`，加一個 locked = false 會收 dialog 嘅對照 test。**推薦 A**（同時修 focus）

### W-725 `features/editor/useEntryEditor.ts:44-52`、`ui/useCropDrag.ts:282-335`：新核心邏輯冇 test

- L1：brief 重點「ETag 412 race」；CHANGELOG「412 重讀再試」；plan L2 §1「預設 center（可以拖）」
- L2：coverage（DramaEditor / ShowEditor / ThemeEditor / useR2AutoCrop test）：`useEntryEditor.ts` 未覆蓋 32、45-50、85-88 行 = `persistPatch` 412 分支同 `patchSaved`；`useCropDrag.ts` lines 46%、branches 0%（拖曳、方向鍵、+ / −）
- L3：`useR2AutoCrop.test` 用假 `patchSaved`，`ThemeEditor.test` 用假 `onApply`，所以真 `patchSaved` + 412 重讀（兩個並發 PUT：自動裁切 + 套用配色）完全冇驗
- 方案 A：`useEntryEditor` renderHook test：第一次 PUT 412 → `getEntry` → 第二次 PUT 用新 ETag、patch 疊喺新版本；兩次都 412 → `false`。`useCropDrag` 加方向鍵 / + / − / locked 唔郁 test。方案 B：喺 `DramaEditor.test` 用 mockApi 做整合 test。**推薦 A**

### W-726 `features/update/PublishPage.tsx:86`、`PublishWarnings.tsx:92`：publish 錯誤狀態同 mockup #f 唔一致

- L1：mockup #f「有錯誤」狀態：「首頁 Banner 不完整：缺少闊版（2000 × 400）」+「前往 Banner 頁」；plan L2 §4「有錯誤（banner 缺圖等）全部展開」
- L2：scratch test render `validation: { ok: false, error: 'banner: image long → abc.webp not uploaded' }`（api `catalog/publish.ts:82` 嘅格式）→ `{ raw: true, link: false }`；現有 `PublishPage.test.tsx:48` 用咗中文假錯誤 `'首頁 Banner 不完整'`，掩蓋咗呢點。另外 `PublishPage.test.tsx:34` 斷言 1 個 contrast + 1 個 neutralTheme =「2 項配色對比度警告」
- L3：validation error 照舊原文顯示，冇翻譯、冇去 Banner 頁嘅連結；摘要將「未設定配色」都算做「對比度警告」
- 方案 A：`validationMessage` 加 `banner:` 規則（中文 + 連 `/banner`），publish 頁錯誤用佢；摘要文字改「N 項配色警告（不影響發佈）」或者分開數。方案 B：只改摘要文字，banner 錯誤入 backlog（正常流程唔會出現）。**推薦 A**

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-910 `ui/ChoiceCanvas.tsx:162-165` + `CropCandidates.tsx:116`：`choice` 每次 render 都係新 object，拖框時每個 pointermove 重畫 3 個候選 + 預覽（模糊候選每次 `ctx.filter` blur）；fit 兩款唔使跟 box 重畫，可以 memo
- S-911 `features/dramas/useRescan.ts:24`：`afterScan` 實際冇作用 —— 掃描唔寫 D1，已儲存版本嘅缺圖 slot 開頁已經入咗 `attempted`（`useR2AutoCrop.ts:171-175`），新短篇要儲存後先由 `updatedAt` effect 觸發；comment / CHANGELOG「重新掃描後」會誤導
- S-912 `ui/ImageSlot.tsx:78-79`：自動裁切 `done` pill 喺用戶之後手動換圖仍然顯示「由 R2 … 自動裁切」
- S-913 `features/banner/useBannerFlow.ts:23`：phase 唔係 ready 時 `return undefined` 會當成功（收 dialog + toast「已更換」但乜都冇寫）；而家 UI 去唔到，建議回錯誤
- S-914 `features/banner/BannerSlots.tsx:269`：兩個 slot 掣 `aria-label` 一樣，螢幕閱讀器分唔到窄版 / 闊版
- S-915 `features/theme/palette.ts:23`（`NEAR_BLACK` 抄 `NEUTRAL_THEME.bg`）、`palette.regression.node.test.ts:19`（`COLOUR_KEYS` 抄 `THEME_COLOUR_KEYS`）：改用 import
- Observation：6 個 commit 都係 test + 實作同一個 commit，冇獨立 red commit；請 developer 補一句 TDD 執行說明
- Observation：`useModalKeys.ts:314` 開 dialog 嗰陣 slot 掣已經 disabled，browser 可能將 focus 移去 body，收 dialog 時還唔到原本個掣（jsdom 重現唔到）

## ✅ 做得好嘅地方

- `loadSource` 先查類型 / 大小 / 檔頭尺寸先 decode，`imageHeader` 覆蓋 PNG / JPEG SOF / WebP VP8 · VP8L · VP8X；`prepareImage` `finally` close bitmap
- `useR2AutoCrop`：逐個 slot decode、最後一次 `patchSaved`，StrictMode 只跑一次有 test；404 / 422 靜靜雞略過、其他錯誤留喺 slot
- `toEntryTheme` 換 10 色、深色清走 scheme / statusBar / accentText、保留 `titleFont` / `headerRule`；新動畫全部喺 `prefers-reduced-motion: no-preference` 入面用 `--motion-*` token

## 修訂代碼（W-724 方案 A 示意）

```ts
// useModalKeys.ts：locked 變 true 時，focus 喺 disabled 掣就移去 dialog（Esc / Tab 仍然由 dialog 收）
useEffect(() => {
    const active = document.activeElement as HTMLButtonElement | null;
    if (locked && active?.disabled) dialogRef.current?.focus();
}, [locked]);
```

## Design / PR 提醒（main agent 開 PR 時）

- PR description 第一行：`Design Origin: mockup: _mockups_/admin-phase4/index.html`（每個新 component comment 已有對應 #a–#f）

## Handoff receipt

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review Lane L2 admin 0.1.0 Phase 4 (feature/admin-phase4 @ c4edfd4)
status: warn
score: 85
hard_gates:
    lint: pass
    type_check: pass
    tests: pass (vitest run 21 changed admin test files, 140 tests)
    coverage: pass (changed pure core modules 91–100%; hooks gap tracked as W-725)
    no_critical: pass
    security_scan: pass (no new deps)
critical: []
warnings: [W-724, W-725, W-726]
backlog: [S-910, S-911, S-912, S-913, S-914, S-915]
next_action: invoke developer to fix W-724 / W-725 / W-726 (one commit each), then re-review those diffs only
context: R2 auto-crop flow, limits, theme preservation, banner two-step and Motion verified. Warnings are a vacuous S-817 Esc test (mutation survives), untested 412 retry / crop drag, and publish error state diverging from mockup #f. No full suite / e2e run. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-phase4.md (committed, not pushed)
```

---

## Re-review（2026-11-13 00:23）

- 目標：`feature/admin-phase4` @ `8d2ce42`，只驗 `7d77877..8d2ce42`（11 commits，38 files，+976 / −88）
- Hard gates：all pass —— `npx eslint apps/admin packages/catalog`、`npx prettier --check apps/admin packages/catalog`、`npx tsc -b apps/admin packages/catalog` 全部 exit 0；`npx vitest run <12 個改動 admin test 檔>` → 12 files / 84 tests pass；`packages/catalog` `npx vitest run src/core src/theme` → 8 files / 329 tests pass；冇跑 full suite / e2e（Hard Rule #7）
- Coverage（lines）：`useEntryEditor` 98.2%、`useCropDrag` 100%（branches 100%）、`useR2AutoCrop` 100%、`useModalKeys` 90.7%、`validationMessage` 100%、`ChoiceCanvas` 100%、`CropCandidates` 92.3%、`useBannerFlow` 97.9%

| ID                 | 狀態    | 驗證                                                                                                                                                                                                                                              |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-724              | ✅ 已修 | `efd6a6b`：locked 時 focus 移去 dialog、Tab 唔走出去。Mutation：`useModalKeys.ts` Esc 拆走 `!locked` → `ImageSlot.test.tsx`「should keep the dialog open on Esc while uploading (S-817)」**fail**（1 failed / 10 passed），已 `git checkout` 還原 |
| focus 還原（Obs.） | ✅ 已修 | `e9a16a4`：`returnFocus` ref；test「should return focus to the slot button when the dialog closes」pass                                                                                                                                           |
| W-725              | ✅ 已修 | `e175110`：`useEntryEditor.test` 412 → 重讀 → 新 ETag 再 PUT、兩次 412 回 `false`、連續 patch 用上一次 ETag；`useCropDrag.test` 方向鍵 / + / − / 拖框 / 角位縮放 / locked                                                                         |
| W-726              | ✅ 已修 | `d2608c2`：`PublishError` 同 mockup #f（`.issues.bad`、中文、`<small>` 提示、「前往 Banner 頁」）一致；用 api 真實錯誤格式 test；摘要改「N 項配色警告」，e2e 文字同步                                                                             |
| S-910              | ✅ 已修 | `abad6c7`：`ChoiceCanvas` rAF + 只跟 mode / box 數值；fit 款唔跟框；候選拖緊停喺撳落前嘅框，放手先畫（`ChoiceCanvas.test`、`CropEditor.test`）                                                                                                    |
| S-911              | ✅ 已修 | `7be3549`：`retry` = 忘記試過（做緊嘅除外）再行；test 覆蓋重掃後再試同做緊唔重複                                                                                                                                                                  |
| S-912              | ✅ 已修 | `434ef32`：手動上載後收起 auto note（status object 由 state 保存，identity 穩定）                                                                                                                                                                 |
| S-913              | ✅ 已修 | `906b2cb`：未裁好回 `banner.notReady`，唔寫唔 toast；`useBannerFlow.test`                                                                                                                                                                         |
| S-914              | ✅ 已修 | `ffec117`：兩個掣 `aria-label` 分窄版 / 闊版                                                                                                                                                                                                      |
| S-915              | ✅ 已修 | `c019e93`：`NEAR_BLACK = NEUTRAL_THEME.bg`；regression test 用 `THEME_COLOUR_KEYS`                                                                                                                                                                |
| S-892              | ✅ 已修 | `8d2ce42`：`packages/catalog/src/core/hexColour.ts` 一條 pattern，reader / contrast 共用；`hexColour.test.ts`                                                                                                                                     |

### Developer 待判斷

- (a) S-915 由 admin `model/theme` import `THEME_COLOUR_KEYS`：test 嘅做法冇問題（admin 入面已經係唯一一份）。但 `model/theme.ts:13` 自己註明「同 packages/catalog themeSchema COLOUR_KEYS」，即係 admin 同 catalog（`themeSchema.ts:15`，冇 export）各有一份 10 色清單，同 S-892 一樣係跨 package 重複 → 開 **S-916**
- (b) `persistPatch` PUT body 帶 `kind` / `id` / `draft` / `updatedAt` / `etag`：**唔使修**。api `content/entries.ts:200-202` 只讀 `body.definition` / `body.images`，其他欄位唔會寫入 D1；client 嘅 `savedEntry` 先 spread entry 再 spread draft，兩者喺重試時都係同一個重讀版本，`draft` / `updatedAt` / `etag` 之後再由 response 覆蓋，唔會有舊值殘留；多出嚟只係幾十 byte

### 新 ID

- S-916 `apps/admin/src/model/theme.ts:14` + `packages/catalog/src/core/themeSchema.ts:15`：10 色 key 清單兩份。建議修法：catalog `themeSchema.ts` 將 `COLOUR_KEYS` 改名 `THEME_COLOUR_KEYS` 並 export（經 `src/index.ts`），admin `model/theme.ts` 改為 `export { THEME_COLOUR_KEYS } from '@903-player/catalog'`（保留 re-export，consumer 唔使改）；加一個 catalog test 斷言 `NEUTRAL_THEME` 嘅 key 涵蓋 `THEME_COLOUR_KEYS`

### 評分（re-review）

| 維度     | 得分    | 滿分    | 備注                                          |
| -------- | ------- | ------- | --------------------------------------------- |
| 正確性   | 25      | 25      | W-726 已修                                    |
| 安全性   | 20      | 20      | 冇新依賴                                      |
| 可維護性 | 20      | 20      | S-916 係 🟢，唔扣分                           |
| 測試覆蓋 | 15      | 15      | W-724 mutation 被 kill；W-725 新 test 齊      |
| 性能     | 10      | 10      | S-910 已修                                    |
| 代碼風格 | 10      | 10      | lint / prettier / tsc 全過                    |
| **總分** | **100** | **100** | **結果：✅ pass**（S-916 按用戶決定同 PR 修） |

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review re-review Lane L2 admin 0.1.0 Phase 4 (feature/admin-phase4 @ 8d2ce42, 7d77877..8d2ce42)
status: pass
score: 100
hard_gates:
    lint: pass
    type_check: pass
    tests: pass (12 changed admin test files / 84 tests; catalog src/core + src/theme 8 files / 329 tests)
    coverage: pass (useEntryEditor 98%, useCropDrag 100%, useR2AutoCrop 100%, useModalKeys 91%)
    no_critical: pass
    security_scan: pass (no new deps)
critical: []
warnings: []
backlog: []
resolved: [W-724, W-725, W-726, S-910, S-911, S-912, S-913, S-914, S-915, S-892, focus-restore observation]
new: [S-916]
next_action: invoke developer to fix S-916 in this PR (one commit, `fix: S-916 | ...`) per user decision; reviewer then verifies only that diff
context: All prior items fixed and verified; W-724 mutation (drop !locked on Esc) now fails the S-817 test. Developer question (b) persistPatch extra body fields — no fix, api reads only definition/images. Question (a) raised as S-916 (catalog/admin duplicate colour key list). Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-phase4.md (committed, not pushed)
```

---

## Re-review 2（2026-11-13 00:34，`d5e5af4..9ebd505`）

- 範圍：`b7e8023`（S-916）、`9ebd505`（上下架記錄顯示 banner 變更）；只驗呢兩個 commit 嘅 diff
- Hard gates：all pass（eslint + prettier 改動檔、`tsc --noEmit` admin / catalog、`npm test -- apps/admin/src/features/history packages/catalog/src/core/themeSchema.test.ts apps/admin/src/model apps/admin/src/features/theme` 14 files / 110 tests pass）；e2e 屬 CI（run 43337905991 跑緊，reviewer 唔跑）

### S-916 狀態

| ID    | 狀態    | 證據                                                                                                                                                                                                                                           |
| ----- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-916 | ✅ 已修 | `b7e8023`：catalog `themeSchema.ts:16` export `THEME_COLOUR_KEYS`（經 `src/index.ts:47`），`readTheme` 用同一份；admin `model/theme.ts` 刪咗本地清單、改 re-export，`palette.ts` 唔使改；`themeSchema.test` 斷言 10 色、全部喺 `NEUTRAL_THEME` |

### 新 commit 結論（`9ebd505`）

- 欄位位置：同 `origin/fix/api-backlog-0.8.1` `80349d8` `apps/api/src/admin/changes.ts:139-141`（`PublishChangeSummary extends ChangeSummary { bannerChanged: boolean }`，放喺每行 `changes` 入面）一致；admin `types.ts` 標 optional，`bannerChangedOf` 只認 `=== true`，舊 api / 舊記錄當冇換 ✅
- 顯示：`BannerLine` 跟 `.hist-row .changes` 四欄 grid（kind / 空 / name / 空），排喺其他變更之後；淨換 banner 唔再出「沒有內容變更」✅
- Test 有效：mutation（a）拎走 `!bannerChanged` → 「only the banner changed」fail；（b）拎走 `<BannerLine />` → 2 個 test fail；還原後全綠。`historyModel.test` 覆蓋 true / false / 欄位冇 / `undefined`
- e2e：mock 加 #3（淨換 banner），`run.mjs` 改等 `#4` 同斷言冇「沒有內容變更」；結果以 CI run 為準
- 冇引入新 🔴 / 🟡

### 範圍外（交 main agent / api lane）

- S-917（待修，同 PR 處理）`apps/api/src/catalog/warnings.ts:20` `NEUTRAL_COLOUR_KEYS` 係第三份 10 色清單（註解仲寫舊名 `COLOUR_KEYS`），改用 catalog `THEME_COLOUR_KEYS`；ID 由 main agent 預留，reviewer 冇另派

### 評分（re-review 2）

| 維度     | 得分    | 滿分    | 備注                                      |
| -------- | ------- | ------- | ----------------------------------------- |
| 正確性   | 25      | 25      | 欄位位置同 api 0.8.1 一致；缺欄位當 false |
| 安全性   | 20      | 20      | 冇新輸入面                                |
| 可維護性 | 20      | 20      | S-916 已修；S-917 屬 api lane             |
| 測試覆蓋 | 15      | 15      | 兩個 mutation 都被 kill                   |
| 性能     | 10      | 10      |                                           |
| 代碼風格 | 10      | 10      | lint / prettier / tsc 全過                |
| **總分** | **100** | **100** | **結果：✅ pass**                         |

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review re-review 2 Lane L2 admin Phase 4 (feature/admin-phase4 @ 9ebd505, d5e5af4..9ebd505)
status: pass
score: 100
hard_gates: {lint: pass, type_check: pass, tests: pass, coverage: pass, no_critical: pass, security_scan: n/a}
warnings: []
backlog: []
resolved: [S-916]
new: []
next_action: main agent proceeds; S-917 (api warnings.ts third colour-key copy, reserved by main agent) to developer in same PR; wait for CI run 43337905991 (incl. e2e) before pushing docs
context: S-916 fixed (catalog exports THEME_COLOUR_KEYS, admin re-exports). 9ebd505 matches api 80349d8 changes.bannerChanged placement; missing field treated as false; mutations on the banner logic fail the new tests. No new IDs from reviewer. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-phase4.md (committed, not pushed)
```

## Re-review 3（S-917）

- 日期：2026-11-13 00:40；審閱者：Code Reviewer；目標：`416ae92`（淨改 `apps/api/src/catalog/warnings.ts`，+3 / −15）；Tier：T1（純 refactor）
- Hard gates：all pass（`npm run lint` eslint + prettier、`npm run typecheck -w apps/api`、related unit `vitest run test/publishWarnings.test.ts test/publish.test.ts` 35/35）。`npm test -w apps/api` 被 `reviewer-test-scope` hook block（full workspace suite），改跑 related test，冇 bypass

| ID    | 狀態    | 證據                                                                                                                                                                                                        |
| ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-917 | ✅ 已修 | 刪咗本地 `NEUTRAL_COLOUR_KEYS`（連舊名 `COLOUR_KEYS` 註解），`isNeutralTheme` 改用 catalog `THEME_COLOUR_KEYS`（`themeSchema.ts:16`，經 `index.ts:47`）；`apps` 非 test 源碼再冇第三份 `'shadowLight'` 清單 |

### 行為不變

- 兩份清單逐項一樣、次序一樣（`bg` … `shadowLight` 10 色，冇 `art`、冇 `statusBar` / `accentText`）；`sameColour`（`toLowerCase()` 比較）同 `warningsOf` 冇改，所以 neutralTheme = 10 色等於 `NEUTRAL_THEME`、唔理 art 同選填欄位、唔分大細楷，同改之前一樣
- 清單長度由 catalog `themeSchema.test.ts:129` 鎖住（10 個、全部喺 `NEUTRAL_THEME`）

### Mutation（做完已 `git checkout` 還原，working tree clean）

| Mutation                                        | 結果                                                            |
| ----------------------------------------------- | --------------------------------------------------------------- |
| M1 比較時漏咗 `track`                           | ✅ kill：「should ignore optional theme keys … changed colour」 |
| M2 `isNeutralTheme` 永遠 `true`                 | ✅ kill：6 / 7 test fail                                        |
| M3 漏咗最後一色 `shadowLight`（`slice(0, -1)`） | ⚠️ 生存：7 / 7 pass                                             |
| M4 色值比較改分大細楷（拎走 `toLowerCase`）     | ⚠️ 生存：7 / 7 pass                                             |

M3 / M4 係 api test 本身嘅缺口（S-917 之前已經咁，今次冇改呢兩部份），唔影響今次結論：S-917 只換清單來源，而清單內容由 catalog test 鎖住。

### 🟢 / Observation

- S-918 `apps/api/test/publishWarnings.test.ts:43-56` 淨改 `track` 一色；冇 test 鎖「每一色都要比」（M3 生存）同「色值唔分大細楷」（M4 生存）。可加：大楷 `NEUTRAL_COLOURS` 都要 warn；逐色改一色（`it.each(THEME_COLOUR_KEYS)`）都唔 warn。入 backlog，唔 block
- Version：api 喺呢個 branch 維持 `0.8.0`（同 merge-base 一樣，`origin/main` 已係 `0.8.1`）冇 bump；純 refactor、行為不變，符合 W-718 先例（用戶決定純 refactor 唔 bump）✅

### 評分（re-review 3）

| 維度     | 得分    | 滿分    | 備注                                     |
| -------- | ------- | ------- | ---------------------------------------- |
| 正確性   | 25      | 25      | 清單同次序一樣，比較邏輯冇改             |
| 安全性   | 20      | 20      | 冇新輸入面                               |
| 可維護性 | 20      | 20      | 10 色清單得返一份（catalog）             |
| 測試覆蓋 | 15      | 15      | M1 / M2 kill；M3 / M4 屬舊缺口，S-918 🟢 |
| 性能     | 10      | 10      |                                          |
| 代碼風格 | 10      | 10      | lint / prettier / tsc 全過               |
| **總分** | **100** | **100** | **結果：✅ pass**                        |

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review re-review 3 S-917 (feature/admin-phase4 @ 416ae92, apps/api/src/catalog/warnings.ts)
status: pass
score: 100
hard_gates: {lint: pass, type_check: pass, tests: pass (related unit 35/35; full api workspace suite blocked by reviewer-test-scope hook), coverage: pass, no_critical: pass, security_scan: n/a}
warnings: []
backlog: [S-918]
resolved: [S-917]
new: [S-918]
next_action: main agent proceeds (no developer fix needed); add S-918 to backlog; push this docs commit only after the CI run for 416ae92 (incl. e2e) has finished
context: S-917 fixed, identical 10-key list and order, sameColour unchanged so behaviour is the same. Mutations: drop track / always true killed; drop shadowLight / case-sensitive survive (pre-existing api test gap, S-918 green). No api bump, consistent with W-718 precedent. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-phase4.md (committed, not pushed)
```

## Re-review 4（S-918）

- 日期：2026-11-13 00:44；審閱者：Code Reviewer；目標：`7b11655`（淨改 `apps/api/test/publishWarnings.test.ts`，+25 / −1）；Tier：T1（淨 test）
- Hard gates：all pass（`npx eslint` + `npx prettier --check` 改動檔同 `warnings.ts`、`npm run typecheck -w apps/api` exit 0、related unit `vitest run --config vitest.config.ts test/publishWarnings.test.ts` 18/18）；冇跑 full suite / e2e

| ID    | 狀態    | 證據                                                                                                                                                                                   |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-918 | ✅ 已修 | `it.each(THEME_COLOUR_KEYS)` 逐色只改一色（`nudged` 改最尾一個 hex 位）都唔出 neutralTheme；加大楷 `NEUTRAL_THEME` 10 色要出 neutralTheme。test 由 7 個變 18 個（+10 逐色、+1 大細楷） |

### Mutation（reviewer 自己重做，做完 `git checkout` 還原，working tree clean）

| Mutation（`apps/api/src/catalog/warnings.ts`）                                   | 結果                                                                                                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| M3 `isNeutralTheme` 漏 `shadowLight`（`filter((key) => key !== 'shadowLight')`） | ✅ kill：「should not warn neutralTheme when only shadowLight differs from NEUTRAL_THEME」（1 failed / 17 passed） |
| M4 `sameColour` 拎走 `toLowerCase()`                                             | ✅ kill：「should warn neutralTheme when NEUTRAL_THEME colours are written in upper case」（1 failed / 17 passed） |

### Test 質素

- 唔 flaky：`nudged` 係純函數（尾位 `0` → `1`，其他 → `0`，一定變），冇時間 / 隨機；每個 case 由 `beforeEach` `seed(3)` + `PASSING_THEME` 重設，互不影響
- 唔係假 test：逐色 case 斷言「冇 neutralTheme」，單睇有機會因寫入失敗而空過，但 `publishBody` 鎖 200，而且 M3 證明 shadowLight case 真係會 fail（其他 9 色行同一條路）；大楷 case 用 `toEqual` 鎖完整 warnings（同時證明大楷 neutral 色冇 contrast 警告）
- 色 key 清單同實作共用 catalog `THEME_COLOUR_KEYS`：從清單刪 key 呢度驗唔到，但長度同內容由 `themeSchema.test.ts:129` 鎖住，可以接受
- 冇新 🔴 / 🟡 / 🟢，冇開新 ID

### 評分（re-review 4）

| 維度     | 得分    | 滿分    | 備注                       |
| -------- | ------- | ------- | -------------------------- |
| 正確性   | 25      | 25      | 淨改 test                  |
| 安全性   | 20      | 20      | 冇新輸入面                 |
| 可維護性 | 20      | 20      | key 清單由 catalog 攞      |
| 測試覆蓋 | 15      | 15      | M1–M4 全部 kill            |
| 性能     | 10      | 10      |                            |
| 代碼風格 | 10      | 10      | lint / prettier / tsc 全過 |
| **總分** | **100** | **100** | **結果：✅ pass**          |

## 最終結論

| ID    | 級別 | 狀態    | 修正 commit                                     |
| ----- | ---- | ------- | ----------------------------------------------- |
| W-724 | 🟡   | ✅ 已修 | `efd6a6b`（+ `e9a16a4` focus 還原 Observation） |
| W-725 | 🟡   | ✅ 已修 | `e175110`                                       |
| W-726 | 🟡   | ✅ 已修 | `d2608c2`                                       |
| S-910 | 🟢   | ✅ 已修 | `abad6c7`                                       |
| S-911 | 🟢   | ✅ 已修 | `7be3549`                                       |
| S-912 | 🟢   | ✅ 已修 | `434ef32`                                       |
| S-913 | 🟢   | ✅ 已修 | `906b2cb`                                       |
| S-914 | 🟢   | ✅ 已修 | `ffec117`                                       |
| S-915 | 🟢   | ✅ 已修 | `c019e93`                                       |
| S-916 | 🟢   | ✅ 已修 | `b7e8023`                                       |
| S-917 | 🟢   | ✅ 已修 | `416ae92`                                       |
| S-918 | 🟢   | ✅ 已修 | `7b11655`                                       |
| S-892 | 🟢   | ✅ 已修 | `8d2ce42`                                       |

- 全部 3 個 🟡、10 個 🟢 已修並驗證，冇未處理項，backlog 冇新增；`feature/admin-phase4` @ `7b11655` code review 結論：✅ pass（100 / 100）
- 未關嘅 Observation：TDD red commit 說明（第一輪）只係流程提醒，唔 block

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review re-review 4 S-918 (feature/admin-phase4 @ 7b11655, apps/api/test/publishWarnings.test.ts)
status: pass
score: 100
hard_gates: {lint: pass, type_check: pass, tests: pass (related unit publishWarnings.test.ts 18/18), coverage: pass, no_critical: pass, security_scan: n/a}
critical: []
warnings: []
backlog: []
resolved: [S-918]
new: []
next_action: main agent proceeds to QA / PR merge flow for feature/admin-phase4; push this docs commit only after the CI run for 7b11655 (incl. e2e) has finished
context: S-918 fixed. Reviewer re-ran M3 (drop shadowLight) and M4 (drop toLowerCase): each now fails exactly one new test (1 failed / 17 passed); restored, tree clean. Tests deterministic (pure nudged helper, beforeEach reseed). Final status: W-724..W-726, S-910..S-918, S-892 all fixed. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-phase4.md (committed, not pushed)
```
