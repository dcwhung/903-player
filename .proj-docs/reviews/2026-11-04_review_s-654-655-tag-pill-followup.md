# Review — 3a tag pill 跟進（S-654 / S-655 / QA e2e）

**日期**：2026-11-04
**Branch**：`fix/home-card/rewatch-pill-margin`
**範圍**：`4ed70bd..2903a27`（`2a1ceaa` S-654、`732ba2d` S-655、`2903a27` QA e2e）
**結果**：✅ pass，93 / 100，冇 🔴 Critical

## Hard Gates

| Gate     | 結果 | 證據                                                          |
| -------- | ---- | ------------------------------------------------------------- |
| Lint     | pass | eslint + prettier（5 個改動檔）                               |
| Type     | pass | `tsc -b`                                                      |
| Tests    | pass | `vitest run src/components/HomePlayerCard src/styles` 59 / 59 |
| Coverage | n/a  | 冇 runtime TS 邏輯改動                                        |
| Security | n/a  | 冇新依賴                                                      |

## Findings

| ID    | 級別 | 內容                                                                      | 狀態                                       |
| ----- | ---- | ------------------------------------------------------------------------- | ------------------------------------------ |
| W-522 | 🟡   | 跟進 commit 冇 bump version（`sw-git-flow` 例外只限修對上一個指令嘅 bug） | ✅ 用戶揀 A：bump 1.21.11（`5aab4fd`）     |
| S-656 | 🟢   | `PX_TIMES` `/g` regex 同 `.test()` 共用，`lastIndex` 有狀態               | ✅ 已修：改「計到冇嘢再變」loop            |
| S-657 | 🟢   | `checkCardTag` 頁頭唔係 `<button>` 會 throw，拖冧成個 section             | ✅ 已修：`?.` + `Boolean(h)`；上下內邊都驗 |

## 做得好

- S-654 token 喺 `:root` 計，`@media` 改 `--ui-scale` 自動跟；只影響播放卡
- S-655 由 tokens.css 讀晒 `--ui-scale`，驗真正 invariant（行高 ≥ 字、內邊 > 0）；舊 CSS fail 3 個
- e2e 量 computed style，今日 + 重溫都驗；舊 CSS 捉到 2 ❌
