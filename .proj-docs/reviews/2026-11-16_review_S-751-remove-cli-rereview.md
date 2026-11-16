# Code Re-review（delta）— 2026-11-16 — S-751 刪 CLI 掃描字眼 + S-747

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/zealous-bardeen-owsi9k` `579f2772..HEAD`（`33b8e211` code、`7e024e3e` docs）；上一輪：`2026-11-16_review_S-751-remove-cli.md`
- 範圍：只驗 S-1015–S-1017 修正 + 用戶批准嘅 wording / URL helper 清理（plan `eventual-snuggling-mango.md`）
- 總評：✅ pass — 冇 🔴 / 🟡；1 項 🟢（S-1018）

## Hard Gates

all pass：eslint（delta TS）0、`prettier --check`（delta 全部檔）過、`tsc --noEmit`（player node / scripts-test、catalog、api `tsconfig{,.node,.worker}.json`）0；
相關 unit：`npm test -- packages/catalog/src/scan apps/player/scripts/tsconfigTypes apps/player/src/catalog/dramas/libraryRoundTrip` 7 files / 85 綠、
`npx vitest run apps/api/test/{adminScan,scan,r2Source}.test.ts` 41 綠；coverage / security n/a（淨刪 code，冇新依賴）。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                |
| -------- | ------- | ------- | ------------------- |
| 正確性   | 25      | 25      | API 字眼冇變        |
| 安全性   | 20      | 20      |                     |
| 可維護性 | 20      | 20      | 🟢 S-1018（唔扣分） |
| 測試覆蓋 | 15      | 15      |                     |
| 性能     | 10      | 10      |                     |
| 代碼風格 | 10      | 10      |                     |
| **總分** | **100** | **100** | api 0.12.1 有 bump  |

**結果：✅ pass**

## 上一輪 item 驗證

- **S-1015 ✅**：`apps/player/scripts/tsconfigTypes.test.ts` 讀 config，鎖 `tsconfig.node.json` `types` 冇 `vite/client` + exclude `scripts/*.test.ts`、scripts-test 只 include `scripts/*.test.ts`、`tsconfig.json` reference 兩個。舊 test 用 TS program 實際 type-check，仲攔到 node 檔用 `/// <reference types="vite/client">`；新 guard 攔唔到呢條，但真正會出事嘅改動（config 加 `vite/client`、改 include / exclude）全部攔到，又快又唔使 20 s timeout，判斷夠用
- **S-1016 ✅**：`testListing.ts`、`types.ts`、`merge.ts`、`existing.ts`、`scan/index.ts` 唔再提 CLI；漏咗一處見 S-1018
- **S-1017 ✅**：`packages/catalog/src/scan/draftSchema.node.test.ts` 3 case（新短篇集連 `firstNo: 0` / 集名 `A _ B` / cover、`files` override（有 assert 真係出 `files`）、每日劇）過 `drama.schema.json`

## 範圍內清理

- `SCAN_WORDING` = 舊 `r2` 字眼原文（逐句對過 diff）；3 個 API call site 去 `source: 'r2'` 之後行為唔變，coordinator 嘅 base / HEAD issue 文字 byte 比對同 API test 41 綠印證
- `findSuspicious` 預設字眼由 folder 變 R2：production caller（`series.ts` L26 / L51）一直有傳 wording，冇 caller 用預設 → 冇行為差
- `episodeUrls` / `coverUrls` 連 test 刪：`git grep` 確認冇 caller；`draft.test.ts` L97 嗰個 URL 對 listing 嘅主 assert 照留
- `draft.test.ts` S-785 block：仲 assert 冇 `--verify|--existing|--id|本機`，正確保住 R2 字眼

## 🟢 Suggestion

- **S-1018** — 仲有兩處描述同現狀唔夾：
    1. `apps/api/src/content/r2Listing.ts` L36 註解「同 CLI 由 fs 砌嘅一樣」（CLI 已刪；S-1016 同類）
    2. `.proj-docs/qa/plans/drama.md` L22 command「AC-9 字眼（folder / r2）」：而家冇 folder 字眼，應改做「base vs HEAD 比 R2 字眼」；L15 AC-11「改用 admin 掃描嘅參數（`id` + `source: 'r2'`）」同同一行後面「清 `source`」自相矛盾，改做「`id`」即可

Observation（唔記 backlog）：`findSuspicious` / `dramaIssues` 仍然一路傳 `wording` 參數，而家只得一套字眼可以直接用常數；`「同R2 資料夾名唔一樣」` 中英之間冇空格係舊 r2 字眼原樣（S-785 決定存完整句子），唔係今次引入。

## Handoff receipt

```handoff-receipt
agent: code-reviewer
target: claude/zealous-bardeen-owsi9k 579f2772..HEAD (33b8e211, 7e024e3e)
status: pass
score: 100
hard_gates: { lint: pass, type_check: pass, tests: pass, coverage: n/a, no_critical: pass, security_scan: n/a }
findings: { critical: 0, warning: 0, suggestion: 1 (S-1018) }
previous_items: { S-1015: fixed, S-1016: fixed, S-1017: fixed }
next_action: proceed_to_qa
context: >-
  Delta re-review：S-1015–S-1017 已修；wording / URL helper 清理冇改 API 行為。S-1018（一個 API 註解 + QA plan 兩句）
  按 repo 規則同一 session 清，可以喺 PR 內順手修。報告只 commit 冇 push。
```
