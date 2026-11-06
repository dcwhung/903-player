# Backlog 登記冊（🟢 / Observation）

**最後更新**：2026-11-06（v1.28.5）

> Review / QA 報告入面嘅 🟢 同 Observation 統一喺呢度追蹤。掃 backlog 時淨係睇「Open」；「Closed」嘅唔使再理。
> 新 finding 照寫喺各自報告，處理完或者決定唔理就喺呢度更新。

## Open

| ID                | 範圍       | 內容                                                                                 | 處理時機             | 來源                                               |
| ----------------- | ---------- | ------------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------- |
| S-703             | Test       | 主頁 / 劇集頁冇 integration test 鎖住 W-531 / S-699 嘅行為（淨係鎖 selector / hook） | 下次改呢兩頁時補     | `reviews/2026-11-05_review_coming-soon`            |
| S-709             | 效能       | `HomePage` 每個播放 tick re-render，收藏 tab 跟住重算                                | 先量度，有感覺先做   | 2026-11-05 收藏 review                             |
| S-710             | 時序       | 播 / 停讀進度靠 `AudioController` 先 `update` 後 `persist` 嘅次序                    | 觀察，未有 bug       | 2026-11-05 收藏 review                             |
| S-712             | UX         | 收藏 tab A → B 淡出用最新 `view` 畫（刻意）                                          | 真機有問題先理       | 2026-11-05 收藏 review                             |
| S-731             | Token      | ON AIR 左邊條幾何寫喺組件 CSS                                                        | 第二處用到先抽 token | `reviews/2026-11-06_review_home-fill-onair`        |
| S-732             | 結構       | `SavedRow` 36 行                                                                     | 下次改 SavedRow 先拆 | `reviews/2026-11-06_review_home-fill-onair`        |
| S-738             | Test       | 主頁播放卡讀屏字（`trackSpokenLabel`）冇頁面斷言                                     | 下次改主頁播放卡時補 | `reviews/2026-11-06_review_spoken-labels-midnight` |
| KI-001 / CUI-0016 | Flaky test | `HomePageWide.test.tsx`「swipe 之後即撳播放」偶然紅，產品行為冇問題                  | 再出現先跟           | `qa/known-issues.md`                               |

## Closed

| ID                                | 結果                                            | 日期       |
| --------------------------------- | ----------------------------------------------- | ---------- |
| S-701、S-704、S-714、S-715、S-719 | v1.28.5 修好                                    | 2026-11-06 |
| S-735、S-736、S-737               | v1.28.5 修好                                    | 2026-11-06 |
| S-720、S-721、S-723、S-724、S-725 | v1.28.4 修好（S-720 = S-724、S-721 = S-725）    | 2026-11-06 |
| S-718                             | `episodes.playing` 已用 `{sep}`，已經冇事       | 2026-11-06 |
| S-706                             | `useTightCount.ts` 已由 `useHideWhenTight` 取代 | 2026-11-06 |
| S-707                             | CSS 已冇寫死嘅「·」                             | 2026-11-06 |
| S-708                             | `tileLeaving` 已刪                              | 2026-11-06 |
| S-727                             | 用戶 v1.28.2 iPhone 真機確認                    | 2026-11-06 |
| S-728                             | 只係記錄，用戶冇再報                            | 2026-11-06 |
| S-702、S-726、S-729、S-733        | PR / commit 備註，PR 已 merge                   | 2026-11-06 |
| S-730、S-734                      | v1.28.3 修好                                    | 2026-11-06 |
