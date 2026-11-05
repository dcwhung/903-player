# QA — P7 #7 成集收藏（bookmark）— 2026-11-05 — S1

- Tier: T2（MINOR 1.27.0，新功能、跨模組）｜Commit: code `a8378ea`（HEAD `24b003c` = re-review 報告，`feature/bookmark/episode`，base `origin/main` merge-base）｜Verdict: ❌ fail（E2E 紅，CUI-0020）
- Ledger（`impact --since $(git merge-base HEAD origin/main)`）：SKIP 0 / REVERIFY 9（card-zoom catalog-data drama home mini-player player-core pwa-shell show-today-page ui-foundation）/ UNCOVERED 51 / IGNORED 1；新 src 27 個 → 新鏈 `bookmark`（`plans/bookmark.md`）；`_mockups_/**`、`e2e/*.mjs`、`package*.json` 照舊唔收入
- CI：run 42019651254 @ `a8378ea` completed **failure**（lint / unit / build success，E2E 4 fail）；run 42016514419 @ `3342a38` 同樣 4 fail。所以本機照跑 lint / e2e 各一次

## Runs

| Command                                                                                | Result                                       | Time |
| -------------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| `npx vitest run` 9 條 REVERIFY 鏈 plan 列嘅 test（106 個 path）+ bookmark 新 test 8 個 | 192 files / 2314 tests pass                  | 134s |
| `npm run lint`（eslint + prettier --check）                                            | exit 0                                       | 42s  |
| `E2E_PORT=4174 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（一次，冇重跑） | **4 FAIL**「4 E2E check(s) failed」，exit 1  | 475s |
| CI 42019651254（lint、unit、build、e2e）@ `a8378ea`                                    | lint / unit / build success；E2E 同樣 4 FAIL | 10m  |

## AC 對照

- AC-1 ☆/★ + 提示：unit `BookmarkButton.test.tsx` `Toast.test.tsx` `EpisodeList` / `TodayShowList` test 綠；e2e「清單收藏 → ★ tab」兩個 layout PASS
- AC-2 ★ tab：`useHomeTab.test.ts`（出 / 淡走 / fallback 'shows'）綠；e2e「左滑移除最後一集」tab 消失 + 跳返「節目」PASS
- AC-3 / AC-4 / AC-5 / AC-6：`HomeSaved.test.tsx` `savedItems.test.ts` `selectors/bookmarks.test.ts` 綠（box / 段 / 次序、▷ 原地播、40% 左滑、最近收聽 10 筆、分欄 1/2/3/solo）；e2e「撳行入頁唔播」（mediaSession paused、highlight）PASS、「▷ 原地播」開播 + ⏸ PASS，hash 斷言 FAIL（W-695 → CUI-0020）
- AC-7：e2e「撳行入頁唔播」唔播；W-529 由 `ShowPage.test.tsx` 綠覆蓋；mini-player 鏈 e2e section 全 PASS
- AC-8：`useRowSwipe` / Toast / HomeTabs CSS 跟 `prefersReducedMotion()` / `prefers-reduced-motion: no-preference`；card-zoom unit 全綠

## Hard Gates

- Tests ❌：plan 列明嘅 e2e 有 3 個 section 紅（`390×844 主流程`、`節目頁 / 今日節目頁尺寸`、`收藏 …：▷ 原地播`）；其餘 gate pass（Coverage 引用 review；PWA gate n/a — 冇改 sw / manifest / build / 更新邏輯；Security / Performance n/a）；KI-001 冇出現

## Findings

### 🟡 W-695 集數行加 ☆ 之後 e2e 冇跟住改 → CI E2E 紅 → CUI-0020

- L1: S1 Hard Gate「Plan 列明嘅 test 全綠」（`plans/show-today-page.md`、`plans/ui-foundation.md`、`plans/bookmark.md` Commands）；AC-1 規定每行 ▶ 左邊有 ☆
- L2: CI 42016514419 @ `3342a38`、42019651254 @ `a8378ea`、本機 `npm run e2e` @ `a8378ea` 三次同樣：`FAIL 今日節目列表：… | 收藏 在晴朗的一天出發 | …`（6 個掣）、`FAIL 節目頁 / 今日節目頁尺寸：中途中止（locator.boundingBox: Timeout 30000ms exceeded.）`、`FAIL 收藏 手機直版 / 闊橫版：▷ 原地播：播嗰陣留喺主頁收藏 tab`；本機 Playwright `goto /903-player/` → `hash= ""`
- L3: `e2e/run.mjs:1445` 同 `:620` 用 `li button` 數 / 讀行掣，而家包埋 ☆（「收藏 19/10 星期一」→ `轉去 收藏` 搵唔到）；`e2e/bookmark.mjs:102` 預期 `#/` 但主頁 hash 係 `""`。產品行為符合 AC（同 section「⏸」PASS），淨係 test；但尺寸 section 中止 = 加 ☆ 後節目頁 / 今日頁尺寸 check 全部冇跑到

### 🟢 / Observation

- S-696 review 只跑 unit、冇跑 e2e，`3342a38` CI 已經紅都冇攔到（backlog：review 引用同 SHA CI 結果）

## Ledger / plans

- 新 `plans/bookmark.md`（AC-1..AC-8、scope、commands）；因 fail **未 freeze** bookmark
- `freeze <chain> S1` @ `24b003c`：只 freeze plan 列明 test 全綠嘅 catalog-data、drama、mini-player；card-zoom home player-core pwa-shell show-today-page ui-foundation（plan 有 `390×844 主流程` 或尺寸 section）同 bookmark 等 CUI-0020 修好重跑 e2e 先 freeze

## 建議補測

- none（CUI-0020 修好就夠；unit 已覆蓋 AC-1..AC-8）

```handoff-receipt
protocol: 2
status: fail
score: n/a
stage: S1
ledger: "SKIP 0 / REVERIFY 9 / UNCOVERED 51 (base merge-base origin/main); froze S1 catalog-data drama mini-player; bookmark + 6 chains pending CUI-0020"
hard_gates:
  lint: pass
  type_check: pass
  tests: fail
  coverage: pass
findings:
  - id: W-695
    severity: major
    L1: "S1 gate plan-listed e2e green; AC-1"
    L2: "CI 42016514419 + 42019651254 + local npm run e2e: 4 FAIL (今日節目列表, 節目頁/今日節目頁尺寸 aborted, 收藏 ▷ 原地播 hash x2)"
    L3: "e2e/run.mjs:1445,620 li button now includes ☆; e2e/bookmark.mjs:102 expects '#/' but home hash is ''"
    ticket: CUI-0020
next_action: invoke_developer
next_agent: frontend-developer
tickets: [CUI-0020]
branch: "feature/bookmark/episode"
context: "bookmark S1 fail @a8378ea: product meets AC (unit 2314/2314, lint 0) but e2e red 4 checks, test-only cause (CUI-0020: e2e/run.mjs + e2e/bookmark.mjs, no src). Size section aborted so star-row sizing unverified. After fix: run npm run e2e once, then QA freezes bookmark + card-zoom home player-core pwa-shell show-today-page ui-foundation S1. QA files uncommitted"
```

---

# S1 重驗 @49a3d2c — 2026-11-05

- Commit: code `49a3d2c`（`9b543ca` CUI-0020 e2e 修正 + `49a3d2c` 碟欄對齊；HEAD `4d3ba23` = re-review 報告）｜Verdict: ✅ pass
- 範圍：`a8378ea..49a3d2c` 非 docs 改動 = `e2e/run.mjs` `e2e/bookmark.mjs`（唔屬任何鏈）、`SavedTab.module.css` + 新 `discColumn.node.test.ts`（bookmark）、`src/styles/tokens.css`（ui-foundation）；其餘 unit 引用上面 2314 / 2314
- CI：run #72 [42046494846](https://github.com/dcwhung/903-player/actions/runs/42046494846) @ `49a3d2c` completed **success**（Detect code changes / Lint, unit & build / E2E 三個 job 都 success，冇 skip）→ 引用，本機冇重跑 lint / e2e

## Runs

| Command                                                                                     | Result                                         | Time |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- |
| `npx vitest run` bookmark + ui-foundation + home plan test + `SavedTab/`（含 `discColumn`） | 79 files / 696 tests pass                      | 46s  |
| `npx vitest run` 所有讀 `tokens.css` 嘅 test（22 檔，包 drama / mini-player 嘅 node test）  | 22 files / 181 tests pass                      | 12s  |
| CI #72（lint、unit、build、e2e）@ `49a3d2c`                                                 | success；E2E 667 PASS「All E2E checks passed」 | —    |

## 重驗結果

- W-695 / CUI-0020 ✅：`今日節目列表` 3 個播放掣 PASS；`節目頁 / 今日節目頁尺寸` 全部 viewport 跑完（350 個尺寸 check PASS，包「唱片 300px」「唱片同今日節目頁一樣大」）；`收藏 …：▷ 原地播：播嗰陣留喺主頁收藏 tab（hash「」）` 兩個 layout PASS
- 碟欄對齊：`discColumn.node.test.ts` 綠；e2e 收藏 8 個 section 全 PASS
- Hard Gates：all pass（PWA gate n/a）；KI-001 冇出現；冇新 finding

## Ledger / plans / tickets

- `plans/bookmark.md`：Scope 加 `discColumn.node.test.ts`，Commands 加 `src/components/pages/home/SavedTab/`
- `freeze <chain> S1` @ `4d3ba23`：bookmark 39、card-zoom 22、home 128、player-core 94、pwa-shell 30、show-today-page 95、ui-foundation 77（catalog-data / drama / mini-player 上次 freeze 咗，冇再改）。`impact` 而家淨返 8 條鏈嘅舊 S3 行，等 release 做 S3；`e2e/*.mjs`、`package*.json` 照舊唔收入
- CUI-0020 → `.tickets/completed/0001-0200/CUI-0020.md`

```handoff-receipt
protocol: 2
status: pass
score: n/a
stage: S1
ledger: "re-verify a8378ea..49a3d2c; froze S1 bookmark card-zoom home player-core pwa-shell show-today-page ui-foundation @4d3ba23; all S1 FROZEN (old S3 rows wait for release)"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
findings: []
next_action: merge_main
next_agent: null
tickets: [CUI-0020]
branch: "feature/bookmark/episode"
context: "bookmark S1 re-verify pass @49a3d2c. CI #72 42046494846 success (lint/unit/build/e2e 667 PASS); local unit 696/696 + tokens.css readers 181/181. CUI-0020 completed. S-696 backlog. QA files uncommitted"
```
