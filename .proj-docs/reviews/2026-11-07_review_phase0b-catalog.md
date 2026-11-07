# Code Review — 2026-11-07 — Backend Phase 0b：抽 `packages/catalog`（v1.29.1）

- 審閱者：Code Reviewer（subagent）
- 目標：`refactor/catalog/extract-package` @ `3bc9c53` vs `origin/main`（4 commits：`cc64de5` package + 35 rename、`06b3f93` player import + root config、`4a0f1cf` docs、`3bc9c53` bump 1.29.1）
- SSoT（L1）：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`「Monorepo 結構」、Phase 0 表（「純 refactor，行為唔變」）；用戶決定「現有用戶零影響」、bump PATCH 1.29.1；`.claude/CLAUDE.md` QA 表
- Tier：T2（跨模組 refactor + root test / tsconfig / eslint config）
- Design Origin：none-required 成立（`.tsx` 只改 import 行，冇 className / layout 改動）
- 總評：package 邊界乾淨，搬出嘅 code 除 import 之外冇改值；production bundle 核過 storage key、R2 base、`BASE_URL` inline、版本號。冇 🔴 / 🟡，只有 🟢

## Hard Gates

all pass

- Lint：`npm run lint`（ESLint + `prettier --check .`）exit 0
- Type：`npx tsc -b`（root references → player + catalog）exit 0
- Tests（Hard Rule 7，只跑相關）：catalog 16 檔 358 pass；player 9 檔 173 pass（`libraryJsonSchemas.node`、`e2eSrcConstants`、`scripts/dramaFromFolder`、`storageMigration`、`showThemes`、`useStartDrama`、`shows/lib/shows`、`dramaShelf`、`dramaTileNotices`）；`--project @903-player/player` 同 `src/utils/date.test.ts` 子字串 filter 都揀啱檔。冇跑 full suite / e2e（CI 跑緊）
- Coverage：n/a（純搬位，catalog test 數 358 不變）；Security：n/a（lockfile 只加 workspace link，冇新第三方依賴）
- Build（核行為）：`npm run build` exit 0；bundle 有 `903player:progress:v2` / `bookmarks:v2`、R2 base、`host: app` → `/903-player/dramas/`（`import.meta.env` 冇殘留）、`1.29.1`

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                      |
| -------- | ------- | ------- | --------------------------------------------------------- |
| 正確性   | 25      | 25      | 常數 / date / theme 值逐字搬；episode ID、URL、key 不變   |
| 安全性   | 20      | 20      | 冇新依賴                                                  |
| 可維護性 | 20      | 20      | 邊界清楚；🟢 S-758、S-760                                 |
| 測試覆蓋 | 15      | 15      | test 全搬；schema 一致性 test 拆兩邊仍然有效；🟢 S-761    |
| 性能     | 10      | 10      | 冇相關                                                    |
| 代碼風格 | 10      | 10      | size rule 覆蓋 `packages/*/src/**`（`--print-config` 核） |
| **總分** | **100** | **100** |                                                           |

**結果：✅ pass**

## 重點逐項

1. **Package 邊界**：`packages/catalog/src` 冇 import player / `../../..` 出 package；`import.meta` 只有 `dramas/episodes.ts` 嗰句 `BASE_URL`（其餘係 comment 同 node test 嘅 `import.meta.url`）。`tsc --listFilesOnly -p tsconfig.src.json` 冇 `lib.dom`、冇 `@types/node`，只有 `vite/client` 過渡 types。`console.d.ts` 只喺 `tsconfig.src.json` 範圍生效；player 經 import 只拉 `.ts`，唔會撞 DOM 嘅 `console`。公開 API 16 組 export 合理（有幾個 player 未用，見 Observation）
2. **Player 舊 path**：`catalog/core`、`dramas/lib/{schema,registry,…}`、`types/drama|weekday`、`selectors/availability` 冇殘留；`catalog/{dramas,shows}/index.ts` 拎走 re-export 之後，所有 caller 改用 `@903-player/catalog`（86 處）。冇 shim
3. **行為不變**：`HK_TIMEZONE`、`LEAVING_SOON_DAYS = 30`、`DRAMA_AUDIO_BASE`、`NEUTRAL_THEME` / `ShowTheme` 逐字搬；`date.ts` 函數同舊版一樣，只係 `splitIsoDate` 改做 export 畀 player 格式化用。35 個 rename 嘅 diff 除 import / comment 之外冇改動
4. **Root vitest**：`projects: ['apps/player', 'packages/catalog']` 用返各自 config；`node_modules/.bin/vitest` 係 hoist 嚟，root 冇宣告（S-759）
5. **ESLint**：`.ts` / `.tsx` size rule glob 加咗 `packages/*/src/**`；`schema.ts` / `registry.ts` 嘅 `max-lines` 豁免 path 跟住改；`packages/*/tests/**` 入咗豁免
6. **Schemas**：`.vscode/settings.json` URL 改啱；資料檔本身冇 `$schema`；README 建議嘅相對 path（7 層 `../`）由 `library/<id>/` 數上去啱。`jsonSchemas.node.test.ts`（schema ↔ runtime 一致性）留喺 package，`libraryJsonSchemas.node.test.ts`（現有資料檔）留喺 player，兩邊都綠
7. **Version**：只改 `apps/player/package.json` + lockfile `packages["apps/player"]`。lockfile 頂層 `"version": "1.29.0"` 係 Phase 0a 前遺留；喺臨時目錄跑 `npm install --package-lock-only` 冇 diff，冇嘢讀佢 → 唔使理（Observation）
8. **`cc64de5` 單獨 build 唔到**：player 仲 import `../types/drama` 等已搬走嘅檔（commit message 有寫明）。main 用 merge commit，`git bisect` 唔加 `--first-parent` 會踩中（S-758）

## 🟢 / Observation（已入 backlog）

- S-758 `cc64de5`：單獨 checkout type check 唔過（bisect 會踩中，要用 `--first-parent`）；commit body 又寫咗「Version bump 1.29.1」但 bump 喺 `3bc9c53`。PR description 寫一句提醒就夠
- S-759 root `package.json`：`npm test` 靠 hoist 嘅 `vitest`（同 S-752 `typescript` 一樣），root 冇宣告；版本一唔夾就會 hoist 唔到
- S-760 `packages/catalog/tests/jsonSchemas.ts:2`：comment 仲寫「tsconfig.app.json 排除咗呢個檔」，而家係 package `tsconfig.src.json` 淨係 include `src`
- S-761 `apps/player/vite.config.ts:90`：`npm run coverage` 只計 player 嘅 `src/**`，catalog 搬走之後冇 coverage 報告（冇 threshold，唔影響 CI）
- Observation：index export 嘅 `earliestDate`、`isArcUpcoming`、`leavingRanges`、`DramaKind` player 冇用（畀將來 backend 用都合理）
- Observation：lockfile 頂層 `version` 見第 7 點
- S-753、S-755：`4a0f1cf` 改好（CLAUDE.md motion path、chains 加 `repo-tooling`），backlog 移去 Closed

## ✅ 做得好嘅地方

- 35 個檔用 `git mv`（R090–R099），review 同 blame 都跟得到；搬位 commit 同 import commit 分開，diff 好睇
- `episodes.ts` 過渡做法寫齊 TODO（tsconfig、index.ts 頭、plan），Phase 2 唔會漏
- schema 一致性 test 按責任拆：規則一致喺 package、資料合格喺 player，package 唔使知 player folder

## 修訂代碼

冇（冇 🔴 / 🟡）。

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "refactor/catalog/extract-package"
context: "Phase 0b packages/catalog v1.29.1 review pass (100); only S-758..S-761 backlog; QA S1 should cite CI run of 3bc9c53 for e2e; integration branch is main (no develop)"
```
