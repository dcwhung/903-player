# Code Review — 隱藏 disabled 還原掣（admin 0.8.1）

- 日期：2026-11-15
- 審閱者：Code Reviewer（subagent）
- 目標：`fix/hide-disabled-revert` 5f0a959（`git diff $(git merge-base HEAD origin/main)..HEAD`，base 6dda2c1）
- 需求：用戶 2026-11-15「every revert button that would be disabled is hidden instead」（CHANGELOG 寫「所有頁面 disabled 嘅還原掣隱藏」）
- Tier：T1（細 UI 改動）
- 總評：編輯頁嘅改動乾淨，`blocked` 改 boolean、`RevertButton` return null，全部編輯頁還原（`RevertMark` / `SlotRevert` / `OtherRevert` / `NameRevert` / 配色 tab / 狀態欄）都行同一個 `Flow`，一次過蓋晒。但「App 外觀」同「首頁 Banner」頁仲有 3 個會 disabled 嘅「還原」掣漏咗（C-023）。

## Hard Gates

| Gate          | 結果 | 證據                                                                                                                                                                     |
| ------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint          | pass | 改咗嘅 4 個 ts / tsx 跑 `npx eslint` exit 0；`prettier --check` CHANGELOG 同 revert 檔過                                                                                 |
| Type check    | pass | root `npx tsc -b` exit 0；repo 冇 `dirtyTip` 殘留                                                                                                                        |
| Tests         | pass | `npx vitest related RevertButton.tsx useEntryRevert.ts zh-HK.ts --run --project @903-player/admin`：80 files / 454 tests 全綠（包括 `writtenChinese.test.ts`）。冇跑 e2e |
| Coverage      | pass | `RevertButton` 兩條分支（blocked / 唔 blocked）都由 `EditorRevert.test.tsx` 行到                                                                                         |
| No Critical   | fail | C-023                                                                                                                                                                    |
| Security scan | n/a  | 冇新依賴                                                                                                                                                                 |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                   |
| -------- | ------ | ------- | -------------------------------------- |
| 正確性   | 10     | 25      | C-023                                  |
| 安全性   | 20     | 20      |                                        |
| 可維護性 | 20     | 20      | 單一出口（`RevertButton`），冇重複判斷 |
| 測試覆蓋 | 15     | 15      | 隱藏 +「已修改」保留都有 assert        |
| 性能     | 10     | 10      |                                        |
| 代碼風格 | 10     | 10      | lint / prettier 過                     |
| **總分** | **85** | **100** |                                        |

**結果：❌ fail**（有 🔴）

## 🔴 Critical

### C-023 「App 外觀」同「首頁 Banner」頁嘅「還原」掣仲係 disabled，冇隱藏

- 位置：`apps/admin/src/features/appearance/AppearanceParts.tsx` `CardHead`（`disabled={!canRestore}`）；caller `IconCard.tsx:119`（`canRestore={custom}`）、`TextCard.tsx:105`（`canRestore={custom}`）、`banner/BannerCard.tsx:53`（`canRestore={Boolean(current)}`）
- L1：用戶 2026-11-15 要求「every revert button that would be disabled is hidden instead」，CHANGELOG 0.8.1 自己都寫「所有頁面 disabled 嘅還原掣隱藏」。呢三個掣嘅字係「還原」（`appearance.restore`），aria-label「還原 App 圖示」「還原名稱與簡介」「還原首頁 Banner」，用緊內建預設時就 disabled
- L2：`npx vitest run apps/admin/src/features/appearance/AppearancePage.test.tsx apps/admin/src/features/banner/BannerCard.test.tsx` 喺 HEAD 全綠，即係 `AppearancePage.test.tsx:42-43`（`'還原 App 圖示'` / `'還原名稱與簡介'` `toBeDisabled()`）同 `BannerCard.test.tsx:61`（`'還原首頁 Banner'` `toBeDisabled()`）仍然成立：掣仲喺度、灰咗
- L3：用戶一入「App 外觀」就會見到兩個灰咗嘅「還原」，同佢嘅要求相反
- 方案 A（推薦）：`CardHead` 喺 `canRestore` false 時唔 render 個掣（`{canRestore && <button …>}`，拎走 `disabled`）；三個測試改做 `queryByRole(…)).not.toBeInTheDocument()`，`BannerCard.test.tsx:77` 嘅 `toBeEnabled()` 改做「存在」；CHANGELOG 0.8.1 加一行。改動細，同編輯頁做法一致
- 方案 B：照留 disabled，但要先問用戶「App 外觀嘅還原預設」算唔算喺「所有頁面」入面。唔推薦：字面就係「還原」掣，而 CHANGELOG 已經寫咗「所有頁面」

## 🟢 / Observation

- S-1012 編輯頁欄位標題行打第一隻字時會縮 2.4 px：`.label-line` 有「已修改」+「還原」= 23 px，淨「已修改」= 20.59 px（用 `apps/admin/src/styles/*.css` 喺 headless Chromium 量，`getBoundingClientRect`），所以下面個輸入框會向上跳 2.4 px，儲存 / 復原後又跳返落去。冇 SSoT 規定，只係 Observation；要處理可以畀 `.revert-mark` 一個 `min-height`（等於 `.revert-btn` 高度）。圖位圓掣係 `position: absolute`，冇 shift
- Observation（冇 ID）：`SaveBar` / `ScheduleSaveBar` 嘅「復原」喺儲存中會 `disabled={saving}`。佢係「復原」（放棄未儲存改動），唔係「還原」，而且淨係儲存嗰陣短暫灰，唔當漏
- Observation（冇 ID）：unit test 冇 assert「改返原值 → 還原掣返嚟」；e2e `revertChecks.mjs` 有（`button.waitFor()`），夠用

## 其他 Focus 核對（冇問題）

- 其他還原掣：記錄頁「還原至 #N」（`HistoryRow` `Action`）本身已經係唔啱就 return null；時間線 `TimelineCards` / `ReorderCard` 冇傳 `blocked`，永遠唔會 disabled；`OtherRevert`、`NameRevert`、`SlotRevert`、配色 tab（`DramaThemeTab` / `ShowThemeCard`）、狀態欄（`RevertLabel`）全部經 `FieldRevert.tsx` `Flow` → `RevertButton blocked={revert.blocked}`，已覆蓋。`RevertDialog`「還原 N 項」冇剔就灰係刻意（plan 2026-11-14 revert-unpublished、mockup ②）
- Focus：`blocked` 只跟 `editor.dirtyKeys` 變。令 dirty 嘅動作（打字、toggle、chip、換圖 dialog）focus 都喺嗰個控制上，唔會喺還原掣；還原 dialog 開住時係 modal，打唔到字。所以 unmount 嗰刻掣冇 focus，唔會跌去 `body`
- 版本：admin 0.8.1；`package-lock.json` 淨改 `apps/admin` version 一行；CHANGELOG 有寫
- PR 未開：開 PR 時第一行要有 `Design Origin:`（呢次係 baseline 改動，`_mockups_/admin-revert` 寫「有未儲存改動時先唔准還原」，冇規定點樣唔准）

## ✅ 做得好嘅地方

- 改一個 component 就蓋晒編輯頁全部還原位，冇逐個 caller 加條件
- 測試用 `/^還原/` regex 確認成頁冇任何還原掣，唔止 `還原簡介`
- e2e 由 `isDisabled` 改做 `waitFor({ state: 'detached' })` 再等返出嚟，消失同返嚟兩邊都鎖住

```
HANDOFF_RECEIPT
from: code-reviewer
to: main-agent
workflow: /fix
status: fail
score: 85
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: fail
  security_scan: n/a
critical_count: 1
warning_count: 0
suggestion_count: 1
review_items: [C-023, S-1012]
next_action: invoke_developer
report: .proj-docs/reviews/2026-11-15_review_hide-disabled-revert.md
context: T1 review of 5f0a959. C-023 = appearance / banner CardHead 還原 still disabled (AppearanceParts.tsx canRestore), fix in this PR then re-review. S-1012 = 2.4 px label-line shift when the button hides (observation, measured in Chromium). Used C-023 and S-1012; W-747 still free (next: C-024 / W-747 / S-1013). Report committed locally, not pushed (code CI running). No e2e run.
```
