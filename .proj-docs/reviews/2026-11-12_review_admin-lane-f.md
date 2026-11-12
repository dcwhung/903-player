# Code Review — Admin backlog Lane F（admin 0.0.2）

- 日期：2026-11-12
- 審閱者：Code Reviewer（獨立）
- 目標：`refactor/admin/lane-f_admin-small-fixes` @ `7fe6a45`，`git diff origin/main..HEAD`（7 commits，14 files，+237 / −72；只改 `apps/admin/**`，另加 `package-lock.json` 一行 admin version）
- Tier：T1（PATCH，admin 單一 workspace；backlog 清理）
- 處理咗嘅 backlog：S-857、S-858、S-859、S-861
- 總評：4 項全部落實，同 Lane A review 🟢 嘅描述一致。S-857、S-859 都有 red commit 先行（喺暫時 worktree 實際跑過，red 嗰陣分別 4 個、3 個 test fail），fix commit 喺後面；S-858 係純 refactor，S-861 只改 test。`packages/catalog` 冇改。冇收斂嘅 🔴 / 🟡，只有 2 條 🟢。
- 備註：dispatch 講 8 commits，實際 `origin/main..HEAD` 係 7 個（2 red + 2 fix + S-861 test + S-858 refactor + version bump），內容齊晒，冇漏

## Hard Gates

all pass。

- ESLint（改動嘅 ts / tsx）：exit 0；`prettier --check`（全部改動檔）：exit 0
- `apps/admin`：`npx tsc -b --noEmit` exit 0
- 相關 unit test：`npx vitest related <7 個改動 source> --run --project @903-player/admin`，29 files / 203 tests pass
- Red evidence：喺 scratchpad worktree checkout `40acec4` → 4 個 S-857 test fail；`abeeef4` → 3 個 S-859 test fail（跑完已移除 worktree）
- 冇跑 full suite 同 e2e（Hard Rule #7）。main agent 報告：root `npm run lint`、`npm test`（358 files / 3816 tests）pass；admin e2e 39 PASS
- Coverage：n/a（冇量度）。新增嘅 `renamedDramaPath`、`placementOf` 緩衝、rAF 節流同 cancel 都有專屬 test
- Security：冇新增依賴
- Version bump：`apps/admin` 0.0.1 → 0.0.2，`package-lock.json` 同步

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                 |
| -------- | ------- | ------- | -------------------------------------------------------------------- |
| 正確性   | 25      | 25      | decode 後先比較；壞 `%xx` 當對唔上；緩衝只喺已打開時生效             |
| 安全性   | 20      | 20      | 列表、tab、改 ID 全部經 `dramaEditorPath` encode                     |
| 可維護性 | 20      | 20      | 刪咗 `renamedPath` 同自寫拆日子；🟢 S-880 只係 comment 唔準          |
| 測試覆蓋 | 15      | 15      | red → green 次序清楚；afterEach 還原 mock 同 `innerHeight`           |
| 性能     | 10      | 10      | scroll / resize 每格 frame 最多量一次，unmount 會 cancel             |
| 代碼風格 | 10      | 10      | lint / prettier 全過；命名常數（`PLACEMENT_HYSTERESIS`、`NO_FRAME`） |
| **總分** | **100** | **100** | **結果：✅ pass**                                                    |

## 🔴 / 🟡

冇。

## 🟢 Suggestion / Observation（入 backlog，唔 block）

- S-880 `model/isoDate.ts:11` comment 寫「欄位唔齊會係 NaN」，但 `splitIsoDate` 只係 `split('-').map(Number)`：`'2026-11'` → `day` 係 `undefined`（type 寫 `number`），`''` → `year = 0`，只有 `'2026-1x-01'` 呢類先係 NaN（node 實測）。admin caller 全部傳完整 ISO，`formatDmy` 先擋 `''`，所以而家冇影響；建議 comment 改做「只收完整 YYYY-MM-DD，其他輸入結果未定義」
- S-881 `ui/usePopoverPlacement.ts`：只喺打開、scroll、resize 先量。`monthWeeks` 每個月 4–6 行，喺月曆入面換月會改高度，但唔會再量，臨界位置向下開咗之後換到 6 行嘅月份可能會俾容器裁走。舊有行為（S-838 已經係咁），唔係今次 regression；如果要處理，可以考慮 `ResizeObserver` 睇住 popover

## ✅ 做得好嘅地方

- `renamedDramaPath` 只 decode 劇嗰段再同 `from` 比，`/dramas/lancy-2`、`/shows/…`、壞 `%E0%A4` 都有 test 證明原樣奉還；`search` 喺 caller 另外接，責任清楚
- `placementOf` 嘅 `current` 係 optional，啱啱打開唔加緩衝，所以 S-838 原有 test 同行為唔變；`current` 喺 effect 入面，月曆一收（unmount）就重置
- DateField test 抽咗 `mockRects` / `stubFrames`，`vi.restoreAllMocks()` 同 `innerHeight` descriptor 移去 afterEach，test fail 都會還原（S-861）；冇加任何動畫，符合 Motion 規則

## Design / PR 提醒（main agent 開 PR 時）

- diff 有 `*.tsx`，PR description 第一行要有 `Design Origin:`。今次冇新 className、冇 layout 改動（只係 href encode、popover 定位節流），建議用 `none-required`

## Handoff receipt

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review admin backlog Lane F (refactor/admin/lane-f_admin-small-fixes @ 7fe6a45)
status: pass
score: 100
hard_gates:
    lint: pass
    type_check: pass
    tests: pass (vitest related, 203 admin tests; red commits 40acec4 / abeeef4 verified failing)
    coverage: n/a
    no_critical: pass
    security_scan: pass (no new deps)
critical: []
warnings: []
backlog: [S-880, S-881]
handled: [S-857, S-858, S-859, S-861]
next_action: proceed to QA (S1 admin chain) / merge after CI green
context: All 4 Lane F items verified against Lane A review descriptions; red-before-green confirmed by running red commits. packages/catalog untouched. Only 🟢 left. Branch has 7 commits (dispatch said 8; nothing missing). PR needs a Design Origin line. Report committed locally, not pushed.
report: .proj-docs/reviews/2026-11-12_review_admin-lane-f.md (committed, not pushed)
```
