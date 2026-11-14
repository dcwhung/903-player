# Code Review — 變更摘要準確度（api 0.12.0 / admin 0.8.0）

- 日期：2026-11-14
- 審閱者：Code Reviewer（subagent）
- 目標：`fix/publish-change-accuracy`（`git diff $(git merge-base HEAD origin/main)..HEAD`，HEAD `c591d8a`，10 個 commit 6edc342…c591d8a）
- Plan：`.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md`（連兩段「實作差異」）；Design Origin：`mockup: _mockups_/admin-publish-summary/index.html`（時間線卡沿用）
- Tier：T2（新 change kind + 新 endpoint + admin UI）
- 總評：六個問題（#1 #2 #4 #5 #6 A，#3 由 #4 處理）全部照 contract 做，偏差都寫咗喺「實作差異」。預覽同真發佈共用 `selectDramas`，`reorder` 用同 player 一樣嘅 `compareOrderThenId`，排序還原 SQL 重用 `orderStatement` 同 S-799 `updated_at` 規則。冇三層收斂嘅 finding。

## Hard Gates

all pass — 改咗嘅 ts / tsx / mjs `npx eslint` exit 0；改咗嘅全部檔 `npx prettier --check` 過；`tsc --noEmit` api / admin / catalog exit 0，另外喺 `c591d8a` 乾淨 worktree 跑 root `npx tsc -b`（同 CI 一樣）exit 0；相關 unit：api `test/selectImages.test.ts` + `test/orderRevert.test.ts` 2 files / 10 tests、catalog `src/admin` 7 files / 67 tests、admin `src/features/{revert,history}` + `timelineEntries` / `timelineModel` + `src/i18n` 15 files / 90 tests 全綠；coverage：`reorderChanges.ts` 100%，`editChanges.ts` 100% lines，`ReorderCard.tsx` 100% lines，admin 改動檔合計 97.9% lines。冇新依賴（`package-lock.json` 淨係兩個 version）。冇跑 e2e。

範圍：淨係 `c591d8a` 為止。Review 期間 branch 多咗 local commit `f9db85d`（history 還原掣樣式），working tree 亦有其他 session 未 commit 嘅 `ReorderCard.tsx` / `zh-HK.ts` / `reorderChecks.mjs` 改動（當時 root `tsc -b` 報 `ReorderCard.tsx(13,1) TS6133 'fieldLabel'`）；兩樣都唔喺今次 review 範圍，commit / push 前要另外跑 `tsc -b` 同 lint。

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                    |
| -------- | ------- | ------- | ------------------------------------------------------- |
| 正確性   | 25      | 25      | 圖對返、排序偵測、還原 SQL 逐項驗過（見下）             |
| 安全性   | 20      | 20      | 新 route 喺 `adminRoutes`，401 / 跨站 403 有測試        |
| 可維護性 | 20      | 20      | `isEntryListed` / `sameJson` / `bumpedUpdatedAt` 抽共用 |
| 測試覆蓋 | 15      | 15      | 用戶個案（蘭茜夫人劇場、森美小儀系列）做咗 api 測試     |
| 性能     | 10      | 10      | 還原用一個 `batch`；值冇變嘅行唔寫                      |
| 代碼風格 | 10      | 10      | lint / prettier 過                                      |
| **總分** | **100** | **100** |                                                         |

**結果：✅ pass**

## 驗證重點（冇 finding，只記錄驗過乜）

- **圖對返（#1 #2）**：`previewDocument`（`${origin}${CATALOG_IMAGE_PATH}<name>`）同 `resolveImages` 出一樣格式嘅 URL，上次發佈嘅 `images` 亦係 URL，所以 `selectImages` 直接抄係啱嘅；預覽（`admin/changes.ts` `previewFor`）同發佈（`selectedDocument`）都經 `selectDramas`，`previous` 都係由同一份 `catalog.json` 解出嚟。臨時 probe（跑完已刪）：同 ID 換返上次版本 → `arcs/a/tile.webp` 用上次值、上次冇嘅 `arcs/a/disc.webp` 刪走；拎走嘅新短篇 slot 指去共用 `tile.webp` → 保留 D1 值（「實作差異」寫明）；佢自己冇 slot 指去嘅 `arcs/b/disc.webp` 刪走。上次冇嘅圖刪走之後，驗證會因為缺圖而 fail closed
- **#4**：`fileOwners` 前後兩份 definition 都計，真改動一定有 owner；新 / 落架短篇嘅檔同以前一樣唔報，淨係少咗 `images` 兜底
- **排序偵測（#6）**：player `dramas/registry.ts` / `shows/registry.ts` 用 `compareOrderThenId`，id = document `entry.id`（`document.ts:132`），同 `listedIds` 一致；淨係比較前後都上架嘅 entry，所以新加、落架、第一次發佈（`prev = null`）唔出，有測試
- **排序還原 SQL**：`json_set` / `json_remove` 原地改，`WHERE … IS NOT` 令值冇變嘅行連 `updated_at` 都唔郁，`updated` = `meta.changes > 0` 嘅行數；`json_type(...) IS NOT NULL` 連 JSON `null` 都清走。Guard 跟 `adminRoutes`（401 / 跨站 403 有測試）
- **`RevertFlow`**：`perform` closure 每次 render 都用新 `entry.etag`，同以前喺確認嗰刻讀 prop 一樣；412 / 409 / toast / focus 照用 `useRevertAction`；`tsc` 確認冇遺漏 `entry=` caller
- **i18n**：`publish.reordered`「{list}排序已更改」、`revert.orderLabel`「還原{list}排序」、`kind.reorder`「修改」全部係書面語，`writtenChinese.test.ts` 過

備注（唔使跟進）：排序還原唔郁從未發佈嘅 entry（contract 寫明），所以還原之後新 entry 嘅 `order` 可能同還原咗嘅值撞（`orderRevert.test.ts` 第一個 case：`fresh` = 1、`golden` = 1）；player 用 id 排撞咗嘅值，結果固定，下次拖曳會重新編號。

## ✅ 做得好嘅地方

- 預覽同真發佈共用同一個 `selectDramas`，`selectImages` 係純 function，測試直接用用戶嘅兩個個案
- `reorder` 卡 key / focus anchor 用 `reorder:<list>`，重讀之後都搵得返；`changeFlagsOf` 冇 `entry` 嘅 item 本身已經跳過
- 抽 `bumpedUpdatedAt`，冇複製 S-799 嘅 SQL

## 🟢 / Observation

冇（冇用新 ID；下一個可用：C-023、W-747、S-1012）。

```
HANDOFF_RECEIPT
from: code-reviewer
to: main-agent
workflow: /fix
status: pass
score: 100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
critical_count: 0
warning_count: 0
suggestion_count: 0
review_items: []
next_action: invoke_qa
report: .proj-docs/reviews/2026-11-14_review_publish-change-accuracy.md
context: T2 review of c591d8a, 0 findings, no new IDs used (C-023 / W-747 / S-1012 free); report committed locally, not pushed (code CI running). f9db85d and the uncommitted ReorderCard.tsx / zh-HK.ts / reorderChecks.mjs WIP are out of scope; WIP currently fails root tsc -b (TS6133 fieldLabel unused)
```

## Delta review — `c591d8a..8923806`（2026-11-14）

範圍：淨係 f9db85d、aad1945、8923806（全部係用戶要求嘅 UI 改動，之前見到未 commit 嘅改動已經喺入面）。

- Hard gates：all pass。改咗嘅 ts / tsx / mjs 跑 `npx eslint` exit 0；14 個改咗嘅檔跑 `prettier --check` 過；root `npx tsc -b` exit 0（TS6133 已經冇）；admin `src/app/Brand.test.tsx`、`src/features/{history,revert}`、`src/ui`、`src/i18n` 34 files / 201 tests 全綠。冇跑 e2e
- f9db85d：`ConfirmDialog` `confirmClassName` 有就用佢，冇就照舊 `danger` / `primary`，其他 caller 冇影響；`.revert-btn` / `.dialog-revert` 喺 `revert.css`（`main.tsx` 全域 import）；`theme.css` 刪咗舊 pill padding，淨係留位置，冇衝突；有測試鎖住兩個掣嘅 class
- aad1945：`revert.orderName`「{list}排序」係書面語，`writtenChinese.test.ts` 過；確認框標題、行、toast 都跟住 list 變；拎走咗冇用嘅 `fieldLabel` import
- 8923806：`__API_VERSION__` 全部改晒（`vite.config.ts` define、`vite-env.d.ts`、`Brand.tsx`、`Nav.tsx`），repo 搵唔到舊名；用戶決定推翻 plan §3b，喺 config 註解同 CHANGELOG 都有寫；記錄頁 `reorder` 行用 `revert.orderName`，同類型欄「修改」唔重複
- 結果：0 finding，冇用新 ID（C-023 / W-747 / S-1012 仍然未用），✅ pass

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: invoke_qa
next_agent: quality-assurance
branch: "fix/publish-change-accuracy"
context: "Delta review f9db85d..8923806 (UI tweaks: unified revert style, list-named reorder dialog, admin version pill): 0 findings, no new IDs; root tsc -b now passes"
blockers: []
```
