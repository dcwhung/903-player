# QA — 讀屏分隔號（a11y-spoken-separator）— 2026-11-06 — S1

- Tier: T1（PATCH v1.28.4，S-723 / S-724 / S-725 + `NowPlaying` `spokenLabel`）| Commit: `e04b66f`（code = `f2ddac6`，之後淨係 review docs）| Verdict: ✅ pass
- Branch: `claude/amazing-volta-6qrm4p`；review `.proj-docs/reviews/2026-11-06_review_a11y-spoken-separator.md`（C=0 W=0，S-735–737 backlog 唔再提）
- Ledger（`impact --since b57eadd`）：SKIP 1（card-zoom）/ REVERIFY 10（bookmark、catalog-data、coming-soon、drama、home、mini-player、player-core、pwa-shell、show-today-page、ui-foundation）/ UNCOVERED 3（`VisuallyHidden/*` → 併入 ui-foundation，plan 已加）；SKIP card-zoom frozen @`237af76`

## Runs

| Command                                                                                                                     | Result                                                                | Time  |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| CI [42296770271](https://github.com/dcwhung/903-player/actions/runs/42296770271) @ `f2ddac6`：changes / lint + unit + build | success（引用；unit = 全 `npm test`，覆蓋 10 條鏈 plan 嘅 unit 指令） | —     |
| 同一個 run 嘅 E2E (Playwright) job                                                                                          | cancelled（`e04b66f` docs push 觸發 concurrency cancel）→ 唔可以引用  | —     |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` @ `e04b66f`（code tree = `f2ddac6`）                               | 755 PASS / 0 FAIL，`All E2E checks passed`                            | 9m55s |
| `npx vitest run --coverage`（改咗嘅 9 個 src 檔，15 個 test 檔）                                                            | 137/137；lines 100%（stmts 99%，branch 95%）                          | 18s   |

## 重點 e2e 抽查（L2，log 節錄）

- S-725 左上角下架字：844×390 / 1600×800「19/12 下架」、1300×800 / 844×390「19/12」，全部 `fits:true`、`looserFits:false`
- 版本號 `v1.28.4` 喺橫額右下角（390×844 / 320×640 / 430×932）
- 主頁即將劇場 / 快將下架讀屏文字、繼續收聽下架字完整、今日節目未上架 section 全部 PASS
- S-723「15:10，未上架」、Today 橫版「現正播放：…，第 1 / 3 個節目」、劇集頁 `drama.nowPlayingArc`：由 `TodayShowList.test.tsx`、`NowPlaying.test.tsx`、`TodayPage.test.tsx`、`DramaPage.test.tsx` 鎖住（CI unit 綠 + 上面 coverage run 綠）

## Hard Gates

all pass（PWA gate：n/a，冇掂 `sw.js` / manifest / build / 更新邏輯，淨係 bump version；Security / Performance：n/a）

## Findings（冇 🔴 / 🟡）

- Observation：CI concurrency `cancel-in-progress` 令 code commit 嘅 E2E 俾之後淨改 docs 嘅 push 取消，而 docs run 又跳過 e2e → branch 上冇 CI e2e 證據，要本地補跑。建議 docs commit 同 code commit 一齊 push，或者 e2e 完咗先 push docs（唔 block）

## 建議補測

- none（文案 / 讀屏 label + 共用 component 搬位，新 `VisuallyHidden.test.tsx` 同改咗嘅 unit test 已鎖住；冇高風險邏輯）

## Freeze

- S1 freeze @`e04b66f`：上面 10 條 REVERIFY 鏈（ui-foundation 加 `VisuallyHidden/*`，刪咗嘅 `SpokenText.module.css` 移出）；之後仍出 STALE 嘅係各鏈舊 **S3** 行，留待下次 S3 release refreeze
- Freeze 後 `impact --since b57eadd`：SKIP 10；ui-foundation 仍 REVERIFY = 佢舊 S3 行引用嘅 plan 檔改咗（S3 再 refreeze）；`SpokenText.module.css` 出 UNCOVERED = 已刪檔，唔使驗

```handoff-receipt
agent: quality-assurance
stage: S1
status: pass
commit: e04b66f (code f2ddac6)
report: .proj-docs/qa/2026-11-06_qa_a11y-spoken-separator.md
findings: C=0, W=0, S=0, observation=1 (CI e2e on f2ddac6 cancelled by docs push concurrency; local e2e used)
tickets: none
next_action: main agent run `npm run lint` on branch head, then merge PR
context: CI 42296770271 @f2ddac6 lint/unit/build success, e2e job cancelled; local full e2e 755/0 @e04b66f (cloud PW_CHROMIUM_PATH); coverage changed files lines 100%; S-725 corner widths pass; ui-foundation plan += VisuallyHidden; 10 chains S1 frozen @e04b66f
```
