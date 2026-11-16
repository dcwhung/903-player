# Batch Review — 2026-11-16 — backlog lanes（L1–L4）

- 審閱者：Code Reviewer（獨立 subagent）
- 目標：branch `claude/brave-gauss-xy73t7`，`git diff origin/main...HEAD`（base `48dfb14`）
- Tier：T2（4 條 lane、5 個 backlog item；改動細、每個 item 有獨立 test）
- 總評：5 個 item 都做足 backlog 原文要求，test 先行（L3 `8e0da67` test commit 喺 fix 之前），冇 🔴。得 1 個 🟡：L4 改咗 player `src/` 但冇 bump player version

## 整體 verdict

- 涵蓋 commit：`29c0fdd`、`e741619`、`ebe9571`、`8e0da67`、`d881095`、`c92203c`、`587c729`（+ 4 個 lane merge commit）
- Hard gates：all pass（main agent 喺 HEAD 跑：`npx tsc -b`、`npm run lint`、`npm test` 435 files / 4591 tests 全綠；reviewer 另跑 diff 相關 8 個 test file，198 tests 全綠，見下）
- Coverage：n/a（冇量度；改動嘅邏輯每條分支都有新 test 直接打中）
- 整體 score：99/100
- Status：⚠️ warn（W-760 要喺 PR 內修，修完 re-review 只驗 W-760）

Reviewer 自己跑（L2 證據）：

```
npx vitest run apps/api/test/latestEpisodeIds.test.ts apps/api/test/webp.test.ts \
  apps/admin/src/ui/DateField.test.tsx apps/player/src/catalog/snapshot/source.test.ts \
  packages/catalog/src/scan/draft.test.ts apps/player/scripts/dramaFromFolder.test.ts   → 6 files / 150 tests pass
npx vitest run apps/api/test/entries.test.ts apps/api/test/publishWarnings.test.ts      → 2 files / 48 tests pass
```

## 評分結果

| 維度     | 得分   | 滿分    | 備注                     |
| -------- | ------ | ------- | ------------------------ |
| 正確性   | 25     | 25      |                          |
| 安全性   | 20     | 20      |                          |
| 可維護性 | 19     | 20      | W-760（-5，攤分 5 item） |
| 測試覆蓋 | 15     | 15      |                          |
| 性能     | 10     | 10      | S-788 減咗 D1 讀取量     |
| 代碼風格 | 10     | 10      |                          |
| **總分** | **99** | **100** |                          |

**結果：⚠️ warn**（分數過 90，但 project 規定 lane 嘅 🟡 要同一個 session 喺 PR 內清，所以交返 developer）

## Section A — L1 S-747（`29c0fdd`）placeholder `arc-NN` 守衛

- 改動：`merge.ts` 加 `isPlaceholderArcId`（`^arc-\d+$`，用返 `PLACEHOLDER_ARC_PREFIX`）+ re-export；CLI warn 文字加「commit 前一定要改名（library test 會擋）」；`dramaFromFolder.test.ts` 逐個 library folder 驗 `drama.json`；`draft.test.ts` 鎖 regex 正反例
- 評分：100 / 100 — pass
- 好：test 由 `readdirSync` 攞 folder，新劇自動包埋；仲有 `arrayContaining(COMMITTED_IDS)` 防止掃少咗
- 發現：
    - 🟢 S-1050 `merge.ts:39`：劇 ID 叫 `arc`（合 `ID_PATTERN`）時，CLI 會派「自動編號」`arc-01`，library test 會當 placeholder 擋（lane 已知）。而家冇呢個劇，建議唔使跟進、唔落 backlog
    - 🟢 S-1051 守衛放 `dramaFromFolder.test.ts` 而唔係 `libraryJsonSchemas.node.test.ts`（lane 已知）：兩度都喺 `npm test`，效果一樣，唔使跟進

## Section B — L2 S-890（`e741619`）非正方形 VP8 test

- 改動：`webp.test.ts` 加 `webpVp8(1216, 684)` case
- 評分：100 / 100 — pass
- 好：闊高唔同，`VP8_HEIGHT_OFFSET` 讀錯格就會 fail，正正補返 backlog 講嘅漏洞；測試名 + 註解講清楚 mutation 意圖

## Section C — L2 S-788（`ebe9571`）淨讀 `episode_ids`（api 0.12.1）

- 改動：`store.ts` 加 `latestEpisodeIds`；`entries.ts` 嘅 `disappearingIds`（PUT warnings）同 `isPublished` 劇分支改用；新 test 4 個 case；api bump 0.12.1
- 評分：100 / 100 — pass
- 核對：SQL 條件同 `latestPublish` 一樣（`status = 'ok' ORDER BY id DESC LIMIT 1`），test 直接同 `latestPublish(...).episodeIds` 比對；未 publish 過 `?? []` → `dramasOf([]).has()` = false，同之前 `!latest → false` 一致；節目分支照讀 document（S-844 fail closed 冇郁）。`entries.test.ts` / `publishWarnings.test.ts` 照過
- 發現：
    - 🟢 S-1052 `store.ts`：`WHERE status = 'ok' ORDER BY id DESC LIMIT 1` 而家喺 `latestPublish` / `latestEpisodeIds` / `latestPublishKey` 寫咗三次，可抽 module const。可以喺今個 PR 順手做，或者唔做（唔影響行為）

## Section D — L3 S-881（`8e0da67` `d881095` `c92203c`）月曆尺寸變再量位（admin 0.8.2）

- 改動：`usePopoverPlacement.ts` feature-detect `ResizeObserver`，睇住 popover，callback 行返 `schedule`（同 resize / scroll 一樣每格 frame 最多量一次），cleanup `disconnect()`；`DateField.test.tsx` 3 個 case（變高轉向上、關咗會 disconnect、冇 RO 照開）
- 評分：100 / 100 — pass
- 核對：`data-placement='up'` 只改 `top` / `bottom`（`theme.css:1877`），唔改尺寸，所以唔會 RO → 換位 → 再 RO 嘅 loop；開場動畫係 `transform`，唔觸發 RO。test 用返 S-859 緩衝（300 → 420）先轉，冇繞過現有規則

## Section E — L4 S-796（`587c729`）dev server 用 library

- 改動：`source.ts` 抽 `usesBundledSnapshot(env)`：`DEV` 或 `test` / `e2e` mode → 唔用 `data/`；`source.test.ts` 4 個情況；README 更新
- 評分：95 / 100 — pass（分數）；W-760 要修
- 核對：production build `DEV=false, MODE=production` → 行為不變；e2e build `DEV=false, MODE=e2e` 照用 library
- 發現：
    - 🟡 **W-760 冇 bump player version**
        - L1：`sw-git-flow` §Version Bump「所有改動預設都要 bump」，唯一例外係修同 session 對上一個指令嘅 bug；S-796 係 2026-11-10 review 留低嘅 backlog，唔符合例外。Project 先例：player `src/` 嘅 fix 都有 bump（例如 `e645494` 1.35.1）
        - L2：`git diff origin/main...HEAD -- apps/player/package.json` 冇改動，仍然係 `1.36.0`；commit `587c729` body 冇 `No version bump:` 說明
        - L3：改動喺 `apps/player/src/`（會入 bundle），版本號冇變令 S3 `impact` base（以 player version commit 計）同 release 記錄對唔上
        - 方案 A（推薦）：player bump 去 `1.36.1`（PATCH），獨立 commit `fix: W-760 | bump player to 1.36.1 for S-796`（連 `package-lock.json`）
        - 方案 B：唔 bump，但要用戶確認「dev-only 改動」算例外，並喺 commit / PR 寫明。Trade-off：慳一次 PWA 版本更新，但開咗規則冇寫嘅先例
    - 🟢 S-1053 `vite build --mode development`：`DEV=true` → 唔用 `data/`（lane 已知）。repo 冇 script 咁用，snapshot plugin 照寫 `data/` 都只係冇人讀，唔影響 production。唔使跟進

## ✅ 做得好嘅地方

- 5 個 item 範圍都貼住 backlog 原文，冇夾帶無關改動；每個 commit 只做一件事
- 純函數抽出嚟測（`isPlaceholderArcId`、`usesBundledSnapshot`、`latestEpisodeIds`），test 唔使靠 build 環境
- S-881 冇 RO 環境嘅 fallback 有 test 鎖住，唔會喺 jsdom / 舊瀏覽器 crash

## 修訂代碼（W-760）

```jsonc
// apps/player/package.json
"version": "1.36.1", // W-760：S-796 改咗 player src，PATCH bump
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: warn
score: 99/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: invoke_developer
next_agent: frontend-developer
branch: "claude/brave-gauss-xy73t7"
context: "Batch L1-L4: A/B/C/D pass; E (L4 S-796) pass by score but W-760 player version not bumped -> fix in PR (bump 1.36.1), re-review W-760 only. S-1052 optional in-PR; S-1050/S-1051/S-1053 no action."
blockers:
  - "W-760: apps/player/package.json still 1.36.0 after S-796 player src change"
```
