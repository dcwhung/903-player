# Code Review — 2026-11-12 — Phase 3c production 回饋修正（8 項）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/charming-heisenberg-8z30x3` `ca8a617..23e25ae`（code commits `0ffb787`–`23e25ae`；`f0af034`、`c6c5e55` 係 deploy docs，唔睇）
- SSoT（L1）：用戶 8 項 production 回饋（main agent 轉述）、`apps/player/src/styles/tokens.css` `--color-disc-blank(-rim)`、`packages/catalog/src/dramas/registry.ts` `artFor`、ai-dev-team `sw-git-flow` §Version Bump
- Tier：T2（admin UI + catalog 新 pure function，冇 API / D1 改動）
- 總評：8 項都跟足要求，改動細、拆得乾淨，新 logic（`legendOf`、`arcDiscOf`、`exampleFileName`）都有 unit test。一個 🟡：冇 bump 版本（W-712），admin pill 會同 3c 一樣顯示 v0.6.0

## Hard Gates

- Lint：`npm run lint`（eslint + `prettier --check .`）exit 0
- Type：`apps/admin`、`packages/catalog` `npx tsc --noEmit -p .` exit 0
- Tests：`npx vitest related --run <35 個改咗嘅 src 檔>` → 145 檔 1476 pass
- Coverage：`example.ts` 100% lines / 81% branch；`legendOf`、`arcDiscOf` 每條分支都有 test
- Security：冇新依賴（n/a）；No Critical：pass
- CI：head `23e25ae` run `43073052430` 跑緊（e2e 由佢驗；唔重跑）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                              |
| -------- | ------ | ------- | --------------------------------- |
| 正確性   | 25     | 25      | 8 項行為同 SSoT 一致              |
| 安全性   | 20     | 20      | 純 UI；Thumb URL 嚟自 image map   |
| 可維護性 | 15     | 20      | W-712（-5）                       |
| 測試覆蓋 | 15     | 15      | 每項都有 unit test；位置另有 e2e  |
| 性能     | 10     | 10      | `legendOf` O(n)，每次 render 一次 |
| 代碼風格 | 10     | 10      | lint / prettier 過                |
| **總分** | **95** | **100** |                                   |

**結果：✅ pass**（W-712 merge 前要修）

## 🟡 W-712 冇 bump 版本：admin pill 仍然顯示 v0.6.0

- 位置：`apps/api/package.json`（`"version": "0.6.0"`）、`apps/api/test/auth.test.ts:136`
- L1：`sw-git-flow` §Version Bump：所有改動都要 bump；唯一例外（修正同一 session 對上一個指令整出嚟嘅 bug）唔成立，因為呢啲係 PR #202 已上線之後嘅 production 回饋。Review 清單「Version bump」= 🟡
- L2：`git diff ca8a617..HEAD -- '*package.json'` 冇輸出；`apps/api/package.json` = 0.6.0，同 `f0af034` deploy 記錄嘅已上線版本一樣
- L3：admin「Admin vX」pill 同 403 頁都讀 api 版本（`Brand.tsx`、`deniedPage.ts`），build 時注入。唔 bump 嘅話，用戶喺 production 分唔出係咪已經上咗呢批修正（同 W-708 一樣嘅問題）
- 方案 A（推薦）：api PATCH 0.6.0 → 0.6.1（純 UI fix，冇新 API），同一個 commit 改 `auth.test.ts:136` 做 `'Admin v0.6.1'`（S-815 hardcode）。`apps/player` 唔使 bump：`exampleFileName` 係新 export，player 冇用，tree-shake 之後 bundle 唔變
- 方案 B：順手將 `auth.test.ts` 改成讀 `pkg.version`（同 `Brand.test.tsx` 一樣），以後 bump 唔使改 test。可以同 A 一齊做，但會超出 W-712 範圍，建議另開 commit（S-815）
- 建議：同意你嘅傾向，用方案 A

## 🟢 / Observation

- S-821 `packages/catalog/src/scan/example.ts`：短篇集會用 `files` override（`{files:{1:'odd name.m4a'}}` → 例子 = `odd name.m4a`，唔係模板砌出嚟），每日播就唔理 `episodes[].file` override（重播 `file:'old.m4a'` → `20250813.m4a`）。兩邊做法唔一致；「模板例子」應該兩邊都唔用 override（已用 tsx 跑過）
- S-822 `example.test.ts` 未覆蓋：daily 冇 `episodes`、冇 `kind`（當 series）。另外 `{no2 [ - {title}.m4a` 呢類未閉合模板會砌出 `{no2 [ - .m4a`，唔會變 undefined；模板係 R2 掃描出嚟、唯讀，而且 schema 會先驗，所以影響低
- S-823 `TimeRoller` 完結 roller 用 `left: 0` 對齊完結框；如果窄畫面完結框貼近右邊，popover 可能超出 viewport（L3，未重現）
- S-824 `savedDiscOf` 只測咗冇圖（`.thumb.blank`）；有圖時標題碟面冇 test。`DramaLegend` 而家只係轉手畀 `ListLegend`，可以刪走

## 重點檢查

- **`exampleFileName` 邊界**：冇 `audio.file` → undefined；冇短篇 / 第一個短篇冇 `name` → undefined；daily 用最早日期，冇日期 → undefined；模板有唔認得嘅 token 或者 token 類型唔啱（例如 series 模板用 `{date}`）→ `renderFileName` throw，`catch` 之後 → undefined；冇 token 嘅模板就原樣顯示。用 `arcEpisodeFile` / `dailyTokens`，同掃描用同一套 token ✅（override 見 S-821）
- **`arcDiscOf` 對比 player**：player `artFor` = `arcArt.get(arc) ?? drama.theme.art ?? NEUTRAL_THEME.art`；admin = 短篇 `disc` → 劇 `disc` → undefined（`Thumb .blank`）。次序一致 ✅。player 嘅劇碟面係必須（`requireImage`），admin 草稿可以冇，所以先多咗黑碟呢一層，顏色同 player token 一樣（`#0a0a0a` / `#1e1e1e`）✅
- **`legendOf`**：圓點用 `entryDotOf`，同 `EntryName` 一樣；「待發佈」條件 `pending && !never && !draft`，同 `EntryName`（`never = draft || flags.never`）一致；「新」= 列表入面嘅劇有 `newArcs` key。`collapseArcs` 一定會顯示新短篇（`notable`），所以唔會出現圖例有「新」但列表見唔到 ✅
- **TimeRoller 位置 / a11y**：popover 放入同一個 `.time-slot`（`position: relative`），用 `top: 100%; left: 0`；DOM 次序變成「框 → roller → 下一個框」，Tab 次序比之前好。`aria-expanded`、Esc / Enter 關閉、focus 返去觸發嗰個框、外面撳收起，全部冇變 ✅
- **TimeRoller test 會唔會轉紅**：我將新 test 套落 `ca8a617` 版本嘅 `TimeRoller.tsx`（臨時 copy，跑完已刪）→ `should open each roller under its own box` **×**（`expected null not to be null`）。Unit test 驗 DOM 結構；真實位置由 e2e `boundingBox` 驗（x 差 ≤ 2px、popover 喺框下面）。兩樣加埋，覆蓋足夠 ✅
- **Thumb `.blank`**：而家所有冇圖嘅碟面（列表、時間線、歷史）都顯示黑碟，同 player 一致；Banner（`tile`）唔受影響 ✅
- **Motion**：冇新增動畫 ✅

## ✅ 做得好嘅地方

- `legendOf` 抽成 pure function，條件同列表 render 共用一樣嘅判斷，唔會兩邊唔同步
- `exampleFileName` 放喺 catalog，重用掃描嘅 token / `arcEpisodeFile`，冇另外寫一套砌檔名
- e2e 用 bounding box 驗 roller 位置，唔係淨係驗 DOM

## 修訂代碼（W-712）

```jsonc
// apps/api/package.json
"version": "0.6.1",
```

```ts
// apps/api/test/auth.test.ts:136
expect(page).toContain('Admin v0.6.1');
```

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (vitest related: 145 files / 1476)"
  coverage: "pass (example.ts 100% lines; legendOf / arcDiscOf all branches tested)"
  no_critical: pass
  security_scan: "n/a (no new dependencies)"
next_action: invoke_developer
next_agent: frontend-developer
branch: "claude/charming-heisenberg-8z30x3"
context: "Phase 3c prod-fix review 95 pass. Fix W-712 before merge: bump apps/api 0.6.0 -> 0.6.1 and auth.test.ts:136 'Admin v0.6.1' (one commit 'fix: W-712 | ...'); then QA S1 admin + catalog-data citing CI of the new head. S-821..S-824 to backlog. Report committed locally, not pushed (CI 43073052430 in progress)."
blockers:
  - "W-712 version bump (api 0.6.1 + auth.test.ts) before merge"
```
