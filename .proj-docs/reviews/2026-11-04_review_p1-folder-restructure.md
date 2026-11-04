# Code Review — P1 #8 Folder Restructure

**日期**：2026-11-04
**Reviewer**：Code Reviewer（獨立 subagent）
**Branch**：`refactor/structure/folder-hierarchy`（base `origin/main` @ `6fe40ae`）
**Commits**：`5e68af2` `d49ad59` `a09eaac` `aefd8c3` `ca50f10`
**Plan**：`/root/.claude/plans/curious-rolling-music.md`（用戶已批）
**結果**：✅ pass — **95 / 100**，無 🔴

## Hard Gates

| Gate                                                                                              | 結果                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Lint                                                                                              | ✅                                         |
| Type check（`npx tsc -b`）                                                                        | ✅                                         |
| Tests（targeted：`src/catalog` + `scripts/dramaFromFolder` + `globalImgCss` + `e2eSrcConstants`） | ✅ 447 / 447                               |
| Coverage                                                                                          | ✅ nested image key 同 `../` 拒絕都有 test |
| Security                                                                                          | n/a（冇新依賴）                            |

Developer 已跑：full unit 2102 / 2102、build、Playwright 4 套劇 16 個短篇碟面冇 404、arcCover pytest 101。

## 評分

| 項目            | 分  | 滿分 | 備註                                 |
| --------------- | --- | ---- | ------------------------------------ |
| Correctness     | 25  | 25   | glob / regex / 16 個 arc path 都驗過 |
| Security        | 20  | 20   |                                      |
| Maintainability | 15  | 20   | W-523                                |
| Test coverage   | 15  | 15   |                                      |
| Performance     | 10  | 10   |                                      |
| Code style      | 10  | 10   |                                      |

## 重點核對

- `folderSource.ts`：`DEFINITION_KEY_PATTERN` 維持一層；`IMAGE_KEY_PATTERN` 先容許 nested；冇 catastrophic backtracking
- `bundledSource.ts`：`../library/*/**/*.webp` 用 `**` 零層都 match，頂層 `disc.webp` / `tile.webp` 照包
- 漏圖會即刻 fail：`readImage` 用 `ctx.files.has(path)`，registry build 時 throw
- `git diff -M`：332 個 rename（大部分 100%）、56 modified、3 對 add/delete（`folderSource.test.ts`、兩個 `bundledSource.ts` 內容改得多，git 認唔到係 rename）
- Design Origin `none-required` 成立：CSS 只係 rename + comment，TSX 只改 import / `vi.mock`
- Folder 分組同 plan §1 一致

## Findings

| ID    | 級別 | 內容                                                                                                                       | 處理                                           |
| ----- | ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| W-523 | 🟡   | README L18/19/22 仲用舊短篇圖名；L49 catalog path；L61 `$schema` 相對 path 深度錯；L63 test path                           | ✅ 已修（docs commit）                         |
| S-658 | 🟢   | `jsonSchemas.node.test.ts:188` `$schema` 例子深度同新 folder 唔夾（只係字串）                                              | ✅ 跟 W-523 一齊修                             |
| S-659 | 🟢   | build 出嘅 arc 圖檔名由 `<slug>-disc-<hash>.webp` 變 `disc-<hash>.webp`；hash 不變但 URL 變，SW 更新時重新下載 32 張圖一次 | Observation，無功能影響                        |
| S-660 | 🟢   | `src/hooks/useMiniPlayer.ts`、`useDramaContinue.ts` 由 `components/pages/home/*` import type（依賴方向反咗，舊已存在）     | Backlog：type 搬去 `src/types/`                |
| S-661 | 🟢   | `design/previews/*.html` 用 `../../src/dramas/…` 相對路徑載圖，而家會冇圖                                                  | Backlog：用嚟做 `mockup:` Design Origin 前要修 |

## HANDOFF_RECEIPT

```HANDOFF_RECEIPT
agent: code-reviewer
task: /review P1 #8 refactor folder restructure
branch: refactor/structure/folder-hierarchy
status: pass
score: 95
findings:
  critical: []
  warning: [W-523]
  suggestion: [S-658, S-659, S-660, S-661]
design_origin: none-required
next_action: proceed_to_qa
```
