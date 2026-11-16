# QA — Lane E CI / e2e（S-757 / S-765 / S-852 / S-853 / S-854 / S-855 + S-868）— 2026-11-12 — S1

- Tier: T1（CI workflow、e2e preview、`vite.config.ts` e2e-only plugin、`vercel.json` 入 scope）| Branch: `fix/lane-e-ci-e2e` | Commit: `d7d2562`（code）/ `4f9aced`（HEAD，S-868 淨註解）| Verdict: ✅ pass
- Ledger（`impact --since "$(git merge-base HEAD origin/main)"` = `713cb85`）: SKIP 11 / REVERIFY 3（catalog-data、coming-soon、repo-tooling）/ UNCOVERED 0 / IGNORED 2（docs）
    - repo-tooling：`ci.yml`、`e2e/run.mjs`、`e2e/harness.mjs`、`vite.config.ts`、plan（AC-6）；catalog-data：`e2e/remoteCatalog.mjs`、plan（AC-4）；coming-soon：`e2e/run.mjs`、`e2e/harness.mjs`
- SSoT: review `.proj-docs/reviews/2026-11-12_review_lane-e-ci-e2e.md`（100/100 pass）；plans `plans/repo-tooling.md`（AC-6）、`plans/catalog-data.md`（AC-4）、`plans/coming-soon.md`（沿用）
- SKIP admin / api / bookmark / card-zoom / drama / home / mini-player / player-core / pwa-shell / show-today-page / ui-foundation（frozen, untouched）

## Runs

| Command                                                                         | Result                                                                                         | 來源 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---- |
| `npm run lint` / `npx tsc -b`                                                   | exit 0 / exit 0                                                                                | main |
| `npm test`                                                                      | 357 files / 3809 tests pass                                                                    | main |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` ×3                     | 每次 782 PASS / 0 FAIL（`/tmp/claude-0/e2e_{1,2,3}.log`）                                      | main |
| 修之前（RED）新 section                                                         | FAIL：SW request 收 200、cache 1 個 key                                                        | main |
| S-854 假 `npx` + 空 `dist/sw.js` 跑 smoke step 頭段                             | 30 秒後 `::error::vite preview did not start…` + `preview.log`，exit 1，冇行到 node            | main |
| Production smoke 全段（production dist，`SMOKE_PORT` 4174）                     | `{ versionShown: true, catalogRequests: [], pageErrors: [] }` exit 0                           | main |
| `vite build --mode e2e --outDir <scratchpad>`，`vite preview --mode e2e` + curl | `e2e-catalog/catalog.json` 404、`e2e-catalog/…/tile.webp` 404；`/903-player/` 同 SPA route 200 | QA   |
| 同一份 dist，`vite preview`（唔帶 mode）+ curl                                  | `e2e-catalog/*` 照舊 200（SPA fallback）→ production / 其他 mode preview 不變                  | QA   |
| `git diff d7d2562 4f9aced -- apps`                                              | 淨註解（`harness.mjs` S-765 說明、`remoteCatalog.mjs` 檔頭第 7 項）→ e2e 證據適用 HEAD         | QA   |

- e2e log 對 AC：`Remote catalog 預設：SW 嘅 catalog.json request 由 preview 答 404（404）`、`catalog-json cache 冇 key（0 個，S-765）`、`PWA 換版（Shift-reload 嘅 tab，S-648）…（A 1、B 1）`、coming-soon「即將上架」5 條，三次全 PASS
- e2e dist 冇 `e2e-catalog/` folder → 404 middleware 唔會遮住真檔；catalog 圖照由 Playwright route 答（「圖由 catalog manifest 嘅 URL 載入」PASS）
- `vercel.json`：`buildCommand` `npm run build -w apps/player`、`outputDirectory` `apps/player/dist`、agent / feature 等 branch prefix `deploymentEnabled: false`（AC-6）
- 冇用 CI：code 同 docs 未 push，未有 run 可引用；push 之後 CI（包括 e2e + production smoke）綠先 merge

## Hard Gates

all pass（Coverage：改動係 CI / e2e harness / e2e-only preview plugin，冇 unit 可計，由 e2e section 鎖住；PWA gate：no，`sw.js` / manifest / 更新邏輯冇改，PWA 換版 section 三次 PASS；Security / Performance：n/a）

## Findings

- 冇 🔴 / 🟡 / 🟢。S-765 已修，Lane C QA 嗰條 Observation 關閉

## 建議補測

- none（S1 低風險 tooling，no edge case gap）

## Ledger 變動

- `freeze repo-tooling S1`：原 23 行 + `vercel.json`（S-757）= 24 行
- `freeze catalog-data S1`：原 131 行（`remoteCatalog.mjs`、plan 換新 hash）；`catalog-data S3` 嘅 plan 行 STALE 留畀 release S3
- `freeze coming-soon S1`：原 162 行（`run.mjs`、`harness.mjs` 換新 hash）

```handoff-receipt
protocol: 1
status: pass
stage: S1
ledger: "FROZEN repo-tooling (+vercel.json) / catalog-data / coming-soon S1 @4f9aced; SKIP 11; UNCOVERED 0"
hard_gates: { tests: pass, coverage: n/a, no_blocking: pass, pwa: n/a, security: n/a, performance: n/a }
tickets: []
next_action: merge_main
next_agent: main
branch: "fix/lane-e-ci-e2e"
context: "Lane E S-757/S-765/S-852/S-853/S-854/S-855 + S-868 S1 pass; main e2e 782/0 x3 @d7d2562 (HEAD diff comment-only); QA curl: e2e-mode preview 404s e2e-catalog/, default-mode preview unchanged; report + ledger committed locally, not pushed; push code+docs together, CI green before merge"
```
