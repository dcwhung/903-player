# QA — v1.29.0 Phase −1 episode ID storage migration — 2026-11-07 — S1

- Tier: T2（MINOR，跨模組：catalog / player / storage）| Commit: `b527d56` | Verdict: ❌ fail（Hard Gate Tests）
- Branch `feature/storage/episode-id`，base `fbb49e1`；review `reviews/2026-11-07_review_v1.29.0.md`；L1：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`「Phase −1」+「實作決定」
- Ledger（`impact --since fbb49e1`）：SKIP 0 / REVERIFY 11（全部鏈）/ UNCOVERED 8（`storageMigration.*`、`episodeId.*`、`dramaFromFolder.*`、`show.schema.json`、`e2e/storageMigration.mjs`）/ IGNORED 4

## Runs

| Command                                                                                         | Result                             | Time |
| ----------------------------------------------------------------------------------------------- | ---------------------------------- | ---- |
| CI [42322295592](https://github.com/dcwhung/903-player/actions/runs/42322295592) @ `b527d56`    | ❌ unit 4 fail；build / e2e 冇跑   | 3m   |
| CI [42321612237](https://github.com/dcwhung/903-player/actions/runs/42321612237) @ `afeb957`    | ❌ 同樣 4 個 fail                  | 4m   |
| `npx vitest run`（11 條鏈 REVERIFY，plan 指令合埋 ≈ 全部 unit，跑一次）                         | 2776 / 2780（4 fail，同 CI）       | 87s  |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（CI e2e 被 unit 擋住冇跑，本地補一次） | 765 PASS / 0 FAIL                  | ~9m  |
| `npx vitest run` storageMigration / episodeId / bookmarkStore / progressStore `--coverage`      | 58 / 58；lines 99.4%、branch 96.5% | 2s   |

- 重點驗收（本地 e2e + unit）：
    1. `舊版進度 / 收藏升級` 10 / 10 PASS：v1 進度（已收聽、聽到 2:00）+ 收藏升級後仍在；再開 app 冇重複（2 條）；v1 原封不動
    2. 新進度 / 收藏 ID 寫入 v2；續播、已收聽、收藏 tab：bookmark / player-core / drama / home e2e 全綠
    3. W-698 ✅ 核實：`storageMigration.ts:83` 淨記 `hasBookmark` 確認寫入咗嘅；`listBookmarks` 每次讀 raw，寫唔到就 false；新 test「should retry on the next launch when the v2 write fails (W-698)」綠
    4. bookmark / comingSoon / hiddenPlayback / homeWide / dramaPages e2e 全綠

## Hard Gates

- ❌ Tests：plan 列明嘅 unit 唔全綠（drama plan `useStartDrama.test.ts`、show-today-page plan `todayItems.test.ts`）；CI 同 SHA 紅
- 其餘 pass（Coverage ≥ 80%；PWA gate n/a：`main.tsx` 淨加 migration call，冇掂 SW 註冊；Security n/a；Performance n/a）

## Findings

### 🟡 W-699 兩個 unit test 仲用 URL 做進度 key → CUI-0023

- L1：drama / show-today-page frozen plan 嘅 unit 指令要全綠；`.github/workflows/ci.yml` unit job；Phase −1「約 15 個非 test 檔…逐個改為用 `id`」
- L2：`npx vitest run src/pages/today/todayItems.test.ts src/hooks/useStartDrama.test.ts` → 4 fail（`expected 'watched'` got `'unwatched'`；`drama:chisee:36-stratagems:7` got `:1`）；CI 42322295592 一樣
- L3：產品 code 已用 ID（`todayItems.ts:46` `watchedIds.has(r.id)`、`selectors/dramas.ts:43,55` `progressMap[e.id]`）；兩個 test 檔唔喺 diff，fixture 仲用 `.url` 做 key → test 漏改，唔係產品 bug

### 🟢 / Observation

- S-749 Review 報「95 pass」但全 unit suite 紅：review 只跑改咗嘅 test 檔，漏咗冇改但用舊 API 語意嘅 test（backlog）

## 建議補測

- none（migration test 已覆蓋對到 / 對唔到 / idempotent / v2 唔覆蓋 / W-698；修 CUI-0023 改返 fixture 就夠）

## Freeze

- 唔 freeze（fail）。CUI-0023 修好、CI 同 SHA 全綠後重驗：引用 CI，unit 淨跑兩個檔；UNCOVERED 檔要開 / 併入鏈（建議 `storageMigration.*`、`episodeId.*` 入 player-core，`dramaFromFolder.*`、`show.schema.json` 入 catalog-data / drama）

```handoff-receipt
agent: quality-assurance
stage: S1
status: fail
commit: b527d56
ci_run: 42322295592 (b527d56, failure: npm test 4 failed; e2e skipped)
local_e2e: 765 PASS / 0 FAIL @ b527d56
tickets: [CUI-0023 (W-699)]
backlog: [S-749]
frozen: none
next_action: invoke_developer
context: "Product code OK (migration e2e 10/10, W-698 verified). Only todayItems.test.ts + useStartDrama.test.ts still key progress by URL. Fix fixtures to .id, push, wait CI green on new SHA, then re-run /test --stage=S1 citing CI."
```
