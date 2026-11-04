# QA — P1 #8 folder restructure — 2026-11-04 — S1

- Tier: T1（PATCH 1.21.14 → 1.21.15，純 folder move + drama arc 圖 layout）｜Commit: `1aa6a88`（`refactor/structure/folder-hierarchy`，base `origin/main` `6fe40ae`）｜Verdict: ✅ pass
- Ledger（`impact --since 6fe40ae`）：SKIP 0 / REVERIFY 8（全部鏈，path-keyed 預期）/ UNCOVERED 357 → 335 個係搬咗位 / 新增嘅檔（新 path，freeze 後收返入鏈），22 個係本來就唔屬任何鏈嘅 tooling / config（見 Observation）

## 改動分類（`git diff -M --name-status 6fe40ae HEAD`）

- 332 R（rename）+ 56 M + 4 A + 3 D；全部 58 個 webp / jpg 係 R100（內容一樣，只係換位）
- R < 100 / M 嘅 src 檔：逐行 diff 去走 import / `from` 行之後，只剩 comment path、`eslint.config.js` path list、`vite.config.ts` 一行 comment、`package.json` version
- 真正行為改動只有 `catalog-data` + `drama`：
    - `src/catalog/core/folderSource.ts`：image key 由 `./<id>/<file>` 改做 `../library/<id>/<可有 sub-folder 嘅 path>`（新 `folderSource.test.ts` 有 sub-folder case）
    - `src/catalog/{dramas,shows}/lib/bundledSource.ts`（D + A 配對）：glob 改 `../library/*/drama.json`、`../library/*/**/*.webp`；shows 保持單層 `*.{jpg,webp}`
    - 5 個 `drama.json`：16 個短篇 `arcs/<slug>/disc.webp`（tile 同）；`schemas/drama.schema.json` 只改 description
- 其餘 6 條鏈（`pwa-shell` `ui-foundation` `player-core` `mini-player` `home` `show-today-page`）：rename-only，冇重跑 feature test

## Runs

| Command                                                                                                                                                  | Result                                                      | Time |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---- |
| python：掃 `src/catalog/dramas/library/*/drama.json` 所有 `.webp/.jpg` 引用，對 disk                                                                     | 44 refs / 0 missing；arc disc 16；disk webp 44              | <1s  |
| grep 舊 path（`src/dramas` `src/shows` `components/<Name>` `./pages/<Name>`）喺 src / e2e / scripts / schemas / tests                                    | 0 hit                                                       | <1s  |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（跑一次；CI run 41865796370 @ `1aa6a88` 仲 queued，引用唔到）                                   | 621 PASS / 0 FAIL，「冇 JS error」「冇 request 出外網」pass | 438s |
| 引用 developer（同 HEAD tree）：tsc、lint、`npm test` 171 檔 / 2102 pass、`npm run build`（61 webp）、Playwright 4 套劇 16 碟冇 404、arcCover pytest 101 | 冇重跑                                                      | —    |

## Hard Gates

all pass（Coverage：冇新邏輯檔，`folderSource.ts` 有新 test 覆蓋 sub-folder key；PWA gate：冇改 `sw.js` / 更新邏輯 / manifest，`vite.config.ts` 只改 comment → n/a，e2e 7 個 PWA 換版 check 照 pass）

## Findings

冇 🔴 / 🟡。

### Observation

- O-1 Ledger：`freeze` 只換同 chain + 同 stage 嘅行，8 條鏈嘅 baseline S3 行（舊 path，`a561a46` / `cdb5263`）仲喺度 → `impact` 會繼續報 REVERIFY 直到下次 S3 re-freeze（1.21.15 release 時）。S3 行係真實歷史，冇手動刪
- O-2 22 個改咗嘅 tooling / config 檔唔屬任何鏈（`e2e/*.mjs` comment、`scripts/arcCover/*`、`scripts/dramaFromFolder.*`、`scripts/*.test.ts`、`schemas/*`、`eslint.config.js`、`vite.config.ts`、`.vscode/settings.json`、`package*.json`）；全部只改 path 字串 / comment / version，由今次 e2e、developer 嘅 `npm test` 同 pytest 覆蓋；baseline 本來就冇收，今次唔擴 scope

## Ledger / plans

- `freeze <chain> S1` × 8，scope = baseline S3 行經 rename map 換新 path（30 / 71 / 94 / 98 / 143 / 52 / 105 / 95 檔，數目同 baseline 一樣）
- `plans/*.md` 8 份：Core glob、1-hop importers、vitest 指令全部換新 path（explicit path 全部 check 過存在）；冇改 AC / Commands 內容

## 建議補測

- none（純搬位；`folderSource.test.ts` 已補 sub-folder key）
