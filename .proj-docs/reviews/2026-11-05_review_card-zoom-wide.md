# Code Review — 2026-11-05 — card-zoom-wide（v1.26.1）

- 審閱者：Code Reviewer（subagent）
- 目標：`feature/motion/card-zoom-wide`，`git diff origin/main...HEAD`（`841f591`、`95b01d1` mockup，`aef88be` fix）
- Tier：T2（UI motion + selector / hook 邏輯）
- Design Origin：`mockup:_mockups_/card-zoom-wide/index.html`（① 同步、② R2、③ C1 → 用戶 2026-11-05 確認照實際狀態做）
- 總評：邏輯由 state 推、唔睇 DOM，selector 純函數有齊測試；不變量全部守住。冇 🔴 / 🟡，只有 4 條 🟢。

## Hard Gates

all pass（lint + prettier、`tsc -b`、16 個相關 unit test 檔 246 tests 全綠；冇新依賴；按指示冇跑 full suite / e2e）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                            |
| -------- | ------ | ------- | --------------------------------------------------------------- |
| 正確性   | 24     | 25      | `starts` 用 canStart\* 預測，極少數 no-op 情況會唔對稱（S-682） |
| 安全性   | 20     | 20      | 冇相關面                                                        |
| 可維護性 | 18     | 20      | `useHomeSide` 抄 `useMiniPlayer` 條件（S-683）                  |
| 測試覆蓋 | 14     | 15      | 閂卡 + 短篇劇集入頁只喺 selector / e2e 覆蓋（S-685）            |
| 性能     | 10     | 10      |                                                                 |
| 代碼風格 | 10     | 10      |                                                                 |
| **總分** | **96** | **100** |                                                                 |

**結果：✅ pass**（🟢 唔扣分；上表係 advisory 分佈）

## 需求對照（逐條）

| 需求                                        | 實作                                                                                      | 判斷 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| 同卡同節目 / 劇集 → `expand`，返回 `back`   | `wideTileMotion` `cardIsPage` → expand；expand 冇帶 `zoomFrom` → `wideBackMotion` 回 back | ✅   |
| ① 卡有 A，撳 B（唔開播、有把手）→ 同步      | `zoom-handle`：卡 / 主頁把手 / 內頁把手同名 `player-panel`，同 root zoom 同一個 VT        | ✅   |
| ② 冇卡撳 B（開播、冇把手）→ zoom，返回 back | `handle=false` → zoom；返回 side=card、冇把手 → back                                      | ✅   |
| ③ 閂卡（已確認照實際狀態）                  | 節目格開播 → 卡開返 → back；短篇劇集唔開播 → zoom-handle / unzoom-handle，返回仍閂卡      | ✅   |
| ⤢ / mini player / 冇 zoomFrom → 唔變        | 冇 zoomFrom 一律 back；⤢、mini player 路徑冇改                                            | ✅   |
| 窄版唔郁                                    | `useGoHome` `!wide` 照舊 `unzoomHome(zoomFrom, go)`；`useTileOpen` 窄版 side=none → zoom  | ✅   |

③ 邏輯一致性：`useReopenHomePlayerCardOnPlay`（`src/hooks/homePlayerCardClosed.ts`）一開播就清 closed store，所以「閂卡撳節目格」嘅返回目標的確係有卡版面，`back` 同實際 state 一致；短篇劇集永遠唔開播，closed 保持 → `side='handle'`，主頁把手 ↔ 內頁把手配對亦合理。截圖 `c2-back-mid`（縮做卡）、`d3-back-mid`（返到仍有「已暫停」把手）同呢個推論吻合。

## 不變量

- 開播喺 click 同步：`HomePage.tsx:62-64`、`:89-92`、`useHomeDramaItems.ts:63-67` 先 start 後 open，同一 handler ✅
- 格仔框 click 嗰刻量（S-681）：`zoomInto` 量框邏輯冇改，只加 `kind` ✅
- zoomFrom 綁 history state（W-527）：`useZoomNavigate` 只喺 `zoomed` 先帶 state；expand 唔帶 ✅
- useCardMotion 唔另開過場：expand 時卡同頁同一個 item，冇 switch；本 diff 冇新增 card motion 觸發 ✅
- 減少動態：`canViewTransition()` 開始嗰刻先問；新 root 動畫喺 `prefers-reduced-motion: no-preference` 入面；`block-size: 100%` 只作用於 VT pseudo-element，唔開 VT 就唔存在 ✅

## Developer 自報偏離（逐條判斷）

1. 新 kind `zoom-handle` / `unzoom-handle`：接受。CSS 全部併入現有 zoom 規則，`ViewTransitionKind` union 有註解，node test 有對名。
2. `useGoHome(page)` 改簽名 + 4 caller：接受。`tsc -b` 過；`DramaHeader` 只喺 `/drama/:dramaId` 下 render，`useParams` 拎得到。
3. 今日格唔用 expand：接受。⤢ 本身只入節目 / 劇集頁，今日頁冇對應卡形態可變。
4. 「同一節目」用卡顯示緊嘅 item：接受。同用戶睇到嘅一致，亦係 mockup 描述。
5. 闊版右邊乜都冇 → unzoom：接受。冇嘢可以配對。
6. 格仔量唔到 → fallback back，但 old snapshot 用 unzoom 規則影：接受（O，見 S-684）。`unzoom-handle` → back 時舊快照嘅內頁把手（`player-panel`）會配到新畫面卡本身 inline 嘅 `player-panel`，gauge / title 只係淡入，效果近似現有 ④；`unzoom` → back 就係 root crossfade。兩者都唔會卡住，`cardZoom.test.ts` 驗咗標記會清。
7. `useHomeSide` 抄 `useMiniPlayer` 條件：接受，建議抽共用（S-683）。對過 `miniPlayerRecordings`：有載入 show 必定入 list，條件等價。
8. `starts` 用 canStart\*：接受，有邊界（S-682）。

## 🔴 / 🟡

冇。

## 🟢 / Observation

- S-682 `src/pages/home/HomePage.tsx:89` / `src/hooks/useStartPlayback.ts:23` — `starts=canStartShow()`，但 `startShow` 喺 `!ready` 或者嗰個節目冇錄音時係 no-op；閂卡時撳呢類格會預測冇把手（zoom），但內頁實際會出閂卡把手，返回就變 unzoom-handle（入同返唔對稱，唔會壞）。L1 ✅ ③ 需求 / L2 ❌ 只係推論 / L3 ✅。可以改做 `startShow` 回 boolean。
- S-683 `src/hooks/useHomeSide.ts:16-20` — `useHasMiniPlayer` 同 `useMiniPlayer` 有冇 content 嘅條件係兩份；之後改 mini player 出唔出嘅規則好易漏改，令返回過場同主頁版面唔夾。建議抽 `hasMiniPlayerContent(recording, todayList, dismissed)` selector，兩邊共用。
- S-684 `src/utils/cardZoom.ts:134` — fallback 用 `retargetViewTransition` 換 kind 之後，舊快照已經跟原本 kind 嘅命名規則影咗；而家效果可以接受，但註解只寫咗「舊 snapshot 照舊」，可以補一句兩款 fallback 實際會點變形，方便之後維護。
- S-685 `src/pages/home/HomePageWideZoom.test.tsx` — 冇 integration test 覆蓋「閂卡 + 短篇劇集格 → zoom-handle」；而家只有 `wideZoomMotion.test.ts` 同 e2e `checkWideClosedCard`。可以加一條，防 `handle` 計算（`useTileOpen.ts` `pageHandle(closed…)`）回歸。

## ✅ 做得好嘅地方

- `wideTileMotion` / `wideBackMotion` 係純 selector，由 state 推、唔睇 DOM，連 mockup 情境編號都有測試。
- e2e probe 喺 VT 前後讀 `viewTransitionName`，直接驗卡 ↔ 把手有冇真係配對，唔係淨係驗 kind。
- Version bump 1.26.0 → 1.26.1 PATCH 符合用戶「上一版 fix」決定。

## 修訂代碼

唔適用（冇 🔴 / 🟡）。

## Handoff receipt

```HANDOFF_RECEIPT
agent: code-reviewer
task: review feature/motion/card-zoom-wide (841f591, 95b01d1, aef88be) v1.26.1
status: pass
score: 96
hard_gates:
  lint: pass
  type_check: pass
  tests: pass (16 related unit files, 246 tests; full suite / e2e not run per scope rule)
  coverage: pass (new selector wideZoomMotion fully covered; hooks covered by useGoHome / HomePageWideZoom tests)
  no_critical: pass
  security_scan: n/a (no new dependencies)
findings:
  critical: []
  warning: []
  suggestion: [S-682, S-683, S-684, S-685]
next_action: proceed_to_qa
context: >
  All requirement scenarios (expand/back, ① zoom-handle sync, ② zoom→back R2,
  ③ per actual state confirmed by user 2026-11-05) and invariants verified.
  Suggestions go to backlog; no re-review needed.
report: .proj-docs/reviews/2026-11-05_review_card-zoom-wide.md
```
