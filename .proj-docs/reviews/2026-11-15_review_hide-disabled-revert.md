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

## Re-review — `5f0a959..eea0cf5`（2026-11-15）

範圍：淨係 C-023 / S-1012 嘅修正（`AppearanceParts.tsx`、`AppearancePage.test.tsx`、`BannerCard.test.tsx`、`revert.css`、CHANGELOG）。

- Hard gates：all pass。改咗嘅 3 個 tsx 跑 `npx eslint` exit 0；`revert.css`、CHANGELOG、`AppearanceParts.tsx` `prettier --check` 過；root `npx tsc -b` exit 0；`npx vitest related AppearanceParts.tsx --run`：4 files / 14 tests 全綠。冇跑 e2e
- C-023 ✅ 已修：`CardHead` 改做 `{canRestore && <button…>}`，冇 `disabled`；三個 assert 改做 `not.toBeInTheDocument()`，自訂 Banner 改做斷言存在；repo 冇再有 assert 呢三個掣 disabled / enabled 嘅測試。`.appearance-card .card-head` 係 `justify-content: flex-end` + pill `margin-right: auto`，掣唔出時「更換」/「儲存」照樣靠右，冇亂。CHANGELOG 有寫
- S-1012 ⚠️ 未完全修好（仍然係 🟢，唔 block）：
    - L2：用 `apps/admin/src/styles/*.css` 喺 headless Chromium 量。冇 web font（system fallback）：`.revert-btn` = 23 px，有掣 / 冇掣嘅 `.label-line` 都係 23 px，輸入框 top 27 / 27，冇跳
    - 但 admin `index.html` 會載 Poppins + Noto Sans TC（`display=swap`）。載咗呢兩隻字型再量（`document.fonts.check` 兩隻都 true）：`.revert-btn` = 25 px（`line-height: normal`），`.label-line` 有掣 25 px、冇掣 23 px，輸入框 top 29 → 27，即係用戶實際用嘅字型仲會跳 2 px（之前 2.4 px）
    - 原因：掣高度跟字型嘅 `line-height: normal` 變，`min-height: 23px` 係 fallback 字型量出嚟嘅數
    - 方案 A（推薦）：`button.revert-btn` 寫死 `line-height`（例如 `17px`），高度就同字型無關；`.revert-mark` `min-height` 用同一個 custom property 計（例如 `--revert-btn-height: calc(17px + 6px)`），唔再手抄數字。`.dialog-revert` 要另外蓋返自己嘅 line-height
    - 方案 B：`min-height` 改做 25 px。最細改動，但換字型或者 fallback 時又會唔夾
- S-1013 🟢 新 Observation：App 外觀 / Banner 還原成功之後，觸發掣 unmount，focus 跌去 `body`
    - L2：臨時 probe（跑完已刪）：`BannerCard`，API mock 喺 `DELETE` 之後 `GET` 回 `banner: null`，撳「還原首頁 Banner」→ 確認「還原」→ 掣消失，`document.activeElement` = `BODY`
    - L1 冇：S-1007 嘅 focus 後備（同欄控制 → 卡 → h1）係編輯頁 `RevertFlow` 嘅 AC-28，冇包 App 外觀。以前掣係變 disabled，focus 都會失效，所以唔算新 regression，只係而家先睇得清楚
    - 建議：還原完掣唔見咗，就 focus 去同一張卡嘅主要掣（「更換」/「儲存」）或者卡標題
- 跟 `.claude/CLAUDE.md`「Parallel lane backlog」：S-1012、S-1013 要喺今個 session 清，可以由呢個 PR 修再 delta re-review，或者由 main agent 開清理 lane
- 結果：C-023 已修，冇 🔴 / 🟡，100/100，✅ pass（S-1012 未完、S-1013 新，兩個都係 🟢）

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
suggestion_count: 2
review_items: [S-1012, S-1013]
next_action: invoke_qa
report: .proj-docs/reviews/2026-11-15_review_hide-disabled-revert.md
context: Re-review of eea0cf5. C-023 fixed. S-1012 only half fixed: min-height 23px matches the button with fallback fonts, but with the production Poppins + Noto Sans TC the button is 25px, so the input still jumps 2px; recommend a fixed line-height on .revert-btn and a shared custom property for the min-height. New S-1013: after an appearance or banner restore, focus falls to body. Both are suggestions that must be cleared this session per CLAUDE.md, either in this PR with a delta re-review or in a cleanup lane. Next free IDs: C-024 / W-747 / S-1014. Report committed locally, not pushed (code CI running). No e2e run.
```
