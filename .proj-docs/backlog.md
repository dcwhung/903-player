# Backlog 登記冊（🟢 / Observation）

**最後更新**：2026-11-07（v1.29.0 review）

> Review / QA 報告入面嘅 🟢 同 Observation 統一喺呢度追蹤。掃 backlog 時淨係睇「Open」；「Closed」嘅唔使再理。
> 新 finding 照寫喺各自報告，處理完或者決定唔理就喺呢度更新。

## Open

| ID    | 範圍                                | 內容                                                                          | 處理時機          | 來源                              |
| ----- | ----------------------------------- | ----------------------------------------------------------------------------- | ----------------- | --------------------------------- |
| S-742 | git                                 | `90f312e` 單獨 checkout `tsc` 錯；type 改動同 caller 放同一 commit            | 以後 commit       | reviews/2026-11-07_review_v1.29.0 |
| S-743 | `useSavedView.ts`                   | 收藏 tab `key` / `zoomKey` / `focusUrl` 仍用 `url`                            | Phase 2 換 URL 前 | reviews/2026-11-07_review_v1.29.0 |
| S-744 | `storageMigration.ts`               | 節目改名前嘅 v1 進度反推唔到，留喺 v1（唔係 regression）                      | 記錄              | reviews/2026-11-07_review_v1.29.0 |
| S-745 | `storageMigration.ts`               | rollback 再升級：v2 已有嗰集唔用 v1 較新進度；可考慮比 `updatedAt`            | 有用戶報先做      | reviews/2026-11-07_review_v1.29.0 |
| S-746 | `storageMigration.ts`               | rollback 期間收藏返「v1.29 移除過」嘅集，再升級唔會搬                         | 記錄              | reviews/2026-11-07_review_v1.29.0 |
| S-747 | `dramaFromFolder.mjs` / schema test | placeholder `arc-NN` 只 warn；test 拒絕 library `drama.json` 出現 `^arc-\d+$` | 下次加劇前        | reviews/2026-11-07_review_v1.29.0 |

## Closed

| ID                                       | 結果                                                                             | 日期       |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| W-698、S-748                             | `9ac2e24` 修好（v2 寫唔到就唔記 migrated，下次再搬；`mergeBookmarks` 改 for-of） | 2026-11-07 |
| S-739、S-740                             | 修好（test 收窄 / 唔再綁死 catalog）；用戶決定唔 bump version                    | 2026-11-06 |
| S-741                                    | 用戶決定唔處理（多一次重讀進度，影響細），close                                  | 2026-11-06 |
| S-703、S-709、S-710、S-731、S-732、S-738 | v1.28.6 修好                                                                     | 2026-11-06 |
| S-701、S-704、S-714、S-715、S-719        | v1.28.5 修好                                                                     | 2026-11-06 |
| S-735、S-736、S-737                      | v1.28.5 修好                                                                     | 2026-11-06 |
| S-720、S-721、S-723、S-724、S-725        | v1.28.4 修好（S-720 = S-724、S-721 = S-725）                                     | 2026-11-06 |
| S-718                                    | `episodes.playing` 已用 `{sep}`，已經冇事                                        | 2026-11-06 |
| S-706                                    | `useTightCount.ts` 已由 `useHideWhenTight` 取代                                  | 2026-11-06 |
| S-707                                    | CSS 已冇寫死嘅「·」                                                              | 2026-11-06 |
| S-708                                    | `tileLeaving` 已刪                                                               | 2026-11-06 |
| S-727                                    | 用戶 v1.28.2 iPhone 真機確認                                                     | 2026-11-06 |
| S-728                                    | 只係記錄，用戶冇再報                                                             | 2026-11-06 |
| S-702、S-726、S-729、S-733               | PR / commit 備註，PR 已 merge                                                    | 2026-11-06 |
| S-712、KI-001 / CUI-0016                 | 用戶決定：要等問題出現 / 重現先跟，先 close；再出現就重開                        | 2026-11-06 |
| S-730、S-734                             | v1.28.3 修好                                                                     | 2026-11-06 |
