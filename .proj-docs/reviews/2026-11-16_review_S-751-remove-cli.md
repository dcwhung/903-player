# Code Review — 2026-11-16 — S-751 刪本機 CLI `dramaFromFolder`

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/zealous-bardeen-owsi9k` vs `origin/main`（`47dbd426` code、`3380494d` docs）
- Tier：T2（刪 CLI + 搬 test + lockfile；app bundle 冇變）
- 總評：✅ pass — 冇 🔴 / 🟡；3 項 🟢

## Hard Gates

all pass：eslint（改動 TS）0、`prettier --check`（全部改動檔）過、`tsc --noEmit`（player `tsconfig.node.json` / `tsconfig.scripts-test.json`、catalog `tsconfig.json`）0、
相關 unit `npm test -- packages/catalog/src/scan packages/catalog/src/core/jsonSchemas apps/player/src/catalog/dramas/libraryRoundTrip` 7 files / 317 綠；
coverage n/a（淨刪 code + test）；security n/a（冇新依賴；`npm install --package-lock-only` 之後 lockfile 冇 diff）。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                          |
| -------- | ------- | ------- | ----------------------------- |
| 正確性   | 25      | 25      | mutation 驗過新 test 真係會紅 |
| 安全性   | 20      | 20      |                               |
| 可維護性 | 20      | 20      | 🟢 S-1016                     |
| 測試覆蓋 | 15      | 15      | 🟢 S-1015、S-1017（唔扣分）   |
| 性能     | 10      | 10      |                               |
| 代碼風格 | 10      | 10      |                               |
| **總分** | **100** | **100** |                               |

**結果：✅ pass**

## 重點核對

1. **覆蓋有冇甩**（舊 `dramaFromFolder.test.ts` 對比）
    - 新劇（URL 對真檔 + `episodeUrls` 對 app）、NFD、cover / ignored、daily：`packages/catalog/src/scan/draft.test.ts` L97 / L143 / L169 / L357 一一對應，`listing.test.ts` 再細分 cover 角色
    - library round-trip（有 existing / 由零）、lancy 合併、kind 唔夾：搬去 `libraryRoundTrip.node.test.ts`；改用 `id: 'lancy'` 之後新短篇 id 由 `arc-01` 變 `lancy-04`，placeholder 路徑由 `draft.test.ts` L82 / L88 / L237 覆蓋；`libraryIds()` 用 readdir，比舊 hard-code `COMMITTED_IDS` 好（新劇自動入）
    - `todayInHongKong`、`verifyUrls`、`run`、destination checks、packaging：淨係 CLI code，API 用自己嘅 `hkToday`
2. **新 test 正確性（L2 mutation）**：將 `packages/catalog/src/dramas/episodes.ts` L54 `padStart(FILE_NO_WIDTH)` 改做 `padStart(3)`（app 規則同掃描規則甩）→ 5 個「regenerate … unchanged」紅（c18 daily 唔受 `no2` 影響，合理）；revert 後 16/16 綠。由零嗰組對呢個 mutation 自洽唔紅，靠 existing 組攔，兩組加埋足夠
3. **殘留引用**：live code / config / README 冇；淨係 session log、舊 plan / QA / ticket 歷史紀錄，同 brief 講嘅 `wording.ts`、`urls.ts`、S-747；另見 S-1016
4. **Lockfile**：root `tsx` 移走；`node_modules/tsx` 剩 `dev + peer + optional`（vite `peerDependenciesMeta.tsx.optional`）；esbuild 平台 pkg 加 `peer: true` 係 npm 重算 metadata；`npm install --package-lock-only` 重算後零 diff → 同 manifest 一致

## 🟢 Suggestion

- **S-1015** — 舊 test 嘅「should not give Node-run scripts vite/client types」guard 一齊刪咗（`tsconfig.node.json` 唔可以有 `vite/client`，否則 Node 行嘅 `scripts/*.ts` 用 `import.meta.env` 都 type 過）；`tsconfig.scripts-test.json` 照留，分隔仍然有效，但而家冇 test 鎖。可搬去 `apps/player/scripts/` 一個 `*.test.ts`（或者簡單 assert `tsconfig.node.json` `types` 冇 `vite/client`）
- **S-1016** — `packages/catalog/src/scan/testListing.ts` L2 註解「同 CLI 由 fs 砌、Worker 由 R2 砌一樣嘅形狀」：呢個 helper 今次先 export 出去，CLI 已刪；同 brief 嗰批 `wording.ts` / `urls.ts`（`episodeUrls` / `coverUrls` 而家淨 test 用）一齊問用戶處理
- **S-1017** — 舊 CLI test 會用 ajv JSON Schema 驗新劇 / daily 草稿；`draft.test.ts` 嘅 `appEpisodes` 只過 `parseDramaDefinition`，冇過 schema。library 由零掃描嗰組有驗 schema，但冇 `firstNo: 0`、集名 `A _ B`、`files` override 呢類 case。可喺 `draft.test.ts` `appEpisodes` 加 `compileSchema('drama')`（`../../tests/jsonSchemas`）

## ✅ 做得好嘅地方

- 新 test 用 admin 真實參數（`id` + `existing` + `source: 'r2'`），同 `apps/api/src/admin/rescan.ts` L142 一致
- README 段落由 70 行 CLI 說明縮做 admin 流程 + 指向守住規則嘅 test；QA plan（drama / catalog-data）同步更新 scope 同 commands

## Handoff receipt

```handoff-receipt
agent: code-reviewer
target: claude/zealous-bardeen-owsi9k (47dbd426, 3380494d) vs origin/main
status: pass
score: 100
hard_gates: { lint: pass, type_check: pass, tests: pass, coverage: n/a, no_critical: pass, security_scan: n/a }
findings: { critical: 0, warning: 0, suggestion: 3 (S-1015, S-1016, S-1017) }
next_action: proceed_to_qa
context: >-
  CLI 刪除冇甩覆蓋；新 round-trip test 經 mutation 驗證會紅。3 項 🟢 按 repo 規則要同一 session 清
  （S-1016 同 brief 嘅 wording.ts / urls.ts 問題一齊問用戶）。報告只 commit 冇 push。
```
