# QA — Backend Phase 1 runtime `catalog.json`（v1.30.0）— 2026-11-07 — S1

- Tier: T3（改啟動次序 `main.tsx`、workbox runtimeCaching、e2e harness）| Code commit: `a954048` | Verdict: ✅ pass
- L1：`.proj-docs/plans/2026-11-07_plan_phase1-runtime-catalog.md`（splash 期間 fetch 最多 1.5s 即用，失敗用 SW cache → 內建；`VITE_CATALOG_URL` 未設 = 零 request、同 v1.29.1 一樣）；review `.proj-docs/reviews/2026-11-07_review_phase1-runtime-catalog.md`（95 pass）
- Ledger（`impact --since 5ae6878` = `git merge-base HEAD origin/main`）：SKIP 1（show-today-page）/ REVERIFY 11 / UNCOVERED 17 個新檔；IGNORED 5
- 新檔分配：`catalog-data` ← `packages/catalog/src/document/*`（3）、`schemas/catalog.schema.json`、`src/catalog/{runtime,runtime.test,runtimeImportOrder.test,catalogJson.test}.ts`、`src/config/{catalogUrl,catalogFetch}.ts`、`src/catalogUrl.d.ts`、`scripts/buildCatalogJson.{mjs,d.mts,test.ts}`、`e2e/remoteCatalog.mjs`；`repo-tooling` ← `scripts/catalogCaching.{ts,test.ts}`（`vite.config.ts` workbox route）
- Plans：`catalog-data` 加 AC-4（runtime catalog + W-702）、scope、指令（新 unit + `remoteCatalog` section + flag off dist grep）；`repo-tooling` 加 `catalogCaching`、PWA gate 註明 flag 有設先加 route

## Runs

| Command                                                                                                                                | Result                                                                                                                                                                             | Time   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| CI run 42427493165 @ `a954048`：Detect / Lint, unit & build / E2E（引用，冇重跑）                                                      | 全 success：unit 249 files / 2953、build v1.30.0、e2e 777 PASS / 0 FAIL（現有 765 + 新 12）                                                                                        | 15 min |
| `npm run build`（production，冇 `VITE_CATALOG_URL`）+ grep `dist`                                                                      | `e2e-catalog\|catalog-json\|catalog-images` 0 檔；`sw.js` NetworkFirst / CacheFirst 0；`assets/*.js` 冇 `no-cache` fetch、冇 `initCatalog` 字串（成段 tree-shake）；splash v1.30.0 | 20 s   |
| Production `dist` 喺 Chromium 開一次（`vite preview`，390×844，抽查）                                                                  | splash 2.5s 移走、版本 1.30.0、0 個 catalog request、外網 host 同舊版一樣（fonts、audio probe）、0 pageerror                                                                       | 10 s   |
| `npm test --` themeSchema / jsonSchemas / libraryJsonSchemas / `document/` / runtime / catalogJson / buildCatalogJson / catalogCaching | 10 files / 381 pass                                                                                                                                                                | 3.5 s  |
| W-702 probe（node，`drama.schema.json` / `show.schema.json` pattern 同 runtime 一樣）                                                  | 兩份 schema pattern 相同；14 個惡意值（`url(`、`URL(`、`var(`、`image-set(`、escape、`;`、`//`、引號…）全拒；4 個合法 gradient / calc 全收；font 拒 `;}` `:` `url(`                | 1 s    |

- CI e2e 涵蓋（L2）：`Remote catalog` 12 / 12（正常即用 + 圖由 manifest URL 載入、壞 JSON、`schemaVersion` 2、慢過 1.5s fallback 且 splash 2879ms 移走、SW cache 入咗後第二次斷網用 cache、remote catalog + v1 → v2 升級）；`PWA 換版` 7 / 7；`v1 → v2 升級` 10 / 10
- W-702 已核實：`themeSchema.ts` 白名單同 JSON schema pattern 逐字一樣（`jsonSchemas.node.test.ts` 鎖住）；現有 library 7 個 `headerRule` / `titleFont` 照 parse（`libraryJsonSchemas` + `catalogJson` 一致性 test 綠）
- 冇做 swapped build / PWA 矩陣（S1 規則）

## Hard Gates

all pass（Tests：CI 全 unit + 全 e2e 綠；Coverage：新 `runtime.ts` / `document.ts` / `catalogCaching.ts` 各有 unit；PWA：換版 section 綠、production `sw.js` 冇新 route；Security：W-702 白名單核實；Performance：n/a，冇 backend API）

## Findings

冇 🔴 / 🟡。

### 🟢 / Observation（入 backlog）

- S-766 現有 765 項 e2e 其實行「flag 開 + catalog 404 → fallback」（e2e build 預設設咗 URL），唔係 production 真正 flag off 路徑（冇 await、冇 SW route）；今次由 dist grep + production smoke 補證，日後可考慮 CI 加一個 production build 嘅 smoke

## 凍結

- `freeze <chain> S1` × 11（REVERIFY 鏈）；scope = ledger 嗰條鏈 S1 path + 上面新檔；證據 = CI 同 SHA 全 unit + 全 e2e + 上表
- `show-today-page`：SKIP frozen（冇改）
- Freeze 後 `impact`：catalog-data / drama / player-core / pwa-shell / ui-foundation 仍 REVERIFY，係 S3 行 STALE（同 main 一樣，留俾下次 S3）；S1 12 條鏈全 FROZEN

## 建議補測

- none（新邏輯已有 unit + e2e 覆蓋）

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: a954048 (code); ledger / plans / report commit on top (docs only)
ci_run: 42427493165 (a954048, success: lint + unit 249/2953 + build v1.30.0 + e2e 777/0 incl. Remote catalog 12/12, PWA 換版 7/7, v1→v2 10/10)
frozen: [bookmark, card-zoom, catalog-data, coming-soon, drama, home, mini-player, player-core, pwa-shell, repo-tooling, ui-foundation] S1
next_action: proceed_to_merge
context: "W-702 verified. Flag off: dist grep clean + production smoke 0 catalog requests. 17 new files assigned (15 catalog-data, 2 repo-tooling). Commit only, not pushed. S-766 backlog."
```
