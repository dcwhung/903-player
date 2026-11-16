# Code Review — 2026-11-16 — S-743 收藏 tab 行 key / 入頁 focus 改用集數 id

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/brave-gauss-xy73t7`（`a765ee7` code、merge `d2bd23a` version bump 1.36.2 → 1.36.3 + backlog 衝突）vs `origin/main`（`5012550`）
- 來源：`reviews/2026-11-07_review_v1.29.0` line 59（S-743）
- Tier：T2（player hooks / 頁面 state 改名，冇新依賴）
- 總評：✅ pass — 冇 🔴 / 🟡；1 項 Observation（唔使跟進）

## Hard Gates

all pass：eslint（改動 TS / TSX）0、`prettier --check`（改動檔 + `package.json` / `package-lock.json`）過；
`tsc -b`、全 repo `npm run lint`、`npm test`（436 files / 4553）由 main agent 喺 `d2bd23a` 跑過；
相關 unit `npm test -- useEpisodeFocus HomeSaved ShowPage DramaPage DailyDramaPage EpisodeList SavedTab` 19 files / 222 綠；
coverage 過（三個頁面嘅 focus 路徑 + 收藏 / 最近收聽 zoom key 都有 test，見重點核對 3）；security n/a（冇新依賴）。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                 |
| -------- | ------- | ------- | ------------------------------------ |
| 正確性   | 25      | 25      | id → url 對應經 mutation 驗證        |
| 安全性   | 20      | 20      |                                      |
| 可維護性 | 20      | 20      | `useSeriesDramaPage` 29 行，守 30 行 |
| 測試覆蓋 | 15      | 15      |                                      |
| 性能     | 10      | 10      | `focusKeyOf` 一次 `find`，同之前一樣 |
| 代碼風格 | 10      | 10      |                                      |
| **總分** | **100** | **100** |                                      |

**結果：✅ pass**

## 重點核對

1. **id / url 分工一致**
    - 收藏行（`rowView`）、最近收聽行：React `key`、`zoomKey`、`onOpen` 全部用 `id`；`RecentPanel.tsx` L23 `zoomKey.episode(row.key)` 跟住 `row.key` 變 id，同收藏行一致
    - 入頁 state `focusId` → `useShowEpisodes` / `focusedEpisode` 用 `e.id === focusId` 揀嗰集；`EpisodeList` 行 key 同 `data-episode-key` 仍係 url，所以由 `focusKeyOf` 轉返 url 先交畀 `useFocusRow`
    - Live code 冇 `focusUrl` 殘留（淨係舊 state 唔認嘅註解同 test）；e2e 冇用 `data-zoom-key` / `focusUrl`
2. **`focusKeyOf` 由 `episodes` 搵，會唔會甩咗清單行**
    - 節目頁：清單 `entries` 多咗未上架集數，但 `UnavailableEpisode` 冇 `id` / `url`，收藏唔會指去佢 → 用 `episodes` 搵冇損失
    - 短篇劇：`listWithAvailability` 嘅行由 `arcs.shown`（`episodes` 子集）嚟；每日劇：`toDailyItems(episodes)` → 全部行都喺 `episodes`
    - 搵唔到（收藏嗰集已唔喺今日 catalog）：之前 `focusUrl` 喺 items 都搵唔到唔會捲，而家 `focusKey` 係 `undefined`，行為一樣
    - 播緊呢套劇時 `focused` 係 `undefined`，但 `focusKeyOf` 唔睇 `loaded` 照捲，同改之前 `focusKey={focusUrl}` 一樣
3. **L2 mutation**：將 `focusKeyOf` 改做直接回傳 `focusId`（即係唔轉 url）→ ShowPage、DramaPage（短篇）、DailyDramaPage 三個「由我的收藏入嚟 highlight」test 紅；revert 後綠。test fixture 嘅 id（`show:gongzi:…` / `drama:…`）同 url 唔同，唔會因為兩者一樣而假綠
4. **舊 history state**：`focusIdFromState({ focusUrl })` 回 `undefined`（有 test）。舊版入頁嗰刻已經即刻 `replace` 清走 `focusUrl`，history 入面實際唔會殘留；就算有，最多唔捲、照自動播，冇 crash
5. **Version / backlog**：`apps/player/package.json` 同 `package-lock.json` 都係 1.36.3，main 係 1.36.2，冇撞號；backlog Open 剩 7 行（P9.5 + 6 項 S），同「最後更新」一致；S-743 入 Closed，main 嘅 S-792 / S-798 關閉保留

## 🟢 / Observation

- **S-1075**（Observation，唔使跟進）— `a765ee7` 同 merge `3d8537c` commit message 寫 player 1.36.2，最終版本由 merge `d2bd23a` 改做 1.36.3；淨係 history 字眼，PR description 寫 1.36.3 就得，唔使改 commit

## ✅ 做得好嘅地方

- 刻意保留 `EpisodeList` 用 url 做行 key，只喺邊界（`focusKeyOf`）轉換，改動範圍細
- 補咗舊 `focusUrl` state 唔認同「收藏 / 最近收聽 zoom key 唔含網址」兩個 test

## Handoff receipt

```handoff-receipt
agent: code-reviewer
target: claude/brave-gauss-xy73t7 (a765ee7, d2bd23a) vs origin/main (5012550)
status: pass
score: 100
hard_gates: { lint: pass, type_check: pass, tests: pass, coverage: pass, no_critical: pass, security_scan: n/a }
findings: { critical: 0, warning: 0, suggestion: 0, observation: 1 (S-1075, no action) }
next_action: proceed_to_qa
context: >-
  S-743 收藏 tab 行 key / zoomKey / 入頁 focus 改用 id；清單行仍用 url，由 focusKeyOf 轉換，
  mutation 驗證三個頁面 test 會紅。S-1075 只係 commit message 版本字眼，唔落 backlog。
```
