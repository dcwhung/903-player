# Code Review — 發佈 / 部署記錄「修改」pill 用返確認發佈頁嘅欄位標籤（admin 0.5.1）

- 日期：2026-11-14
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/admin-history-change-fields`，`git diff origin/main...HEAD`（`8361683`）
- Tier：T1（admin 純前端顯示；重用 PR #240 嘅 `editFieldsText`，冇新 i18n 字串，api 唔變）
- 總評：改動細、方向啱。`itemStatusOf` 改用 `editFieldsText`，history pill 同確認發佈頁顯示同一套標籤，刪咗重複嘅 `fieldLabel`。冇三層收斂嘅 🔴 / 🟡。有 3 項 🟢，其中 S-996（長欄位 list 會擠扁名、溢出行）係舊問題，唔係今次引入，但係建議喺同一個 PR 順手修

## Hard Gates

全部 pass。

- `npx eslint apps/admin/src/features/history apps/admin/src/features/update/changeFields.ts`：exit 0；`npx prettier --check apps/admin/src/features/history apps/admin/CHANGELOG.md`：pass。`e2e/selectiveChecks.mjs` 由 developer 嘅 repo-wide `npm run lint` 覆蓋
- `npx tsc -b apps/admin`：exit 0
- `npx vitest related historyModel.ts HistoryRow.tsx writtenChinese.test.ts --run --coverage`：4 files，22 tests pass
- Coverage `historyModel.ts`：lines 96%，statements 92.6%，branches 82.8%（≥ 80%）
- 冇新依賴。冇跑 full suite 同 e2e（Hard Rule #7）。lint、tsc、unit 分開三條 command 跑，冇觸發 hook

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                                                          |
| -------- | ------- | ------- | ----------------------------------------------------------------------------- |
| 正確性   | 25      | 25      | `kind.edit` fallback 保留；短篇寫短篇名；認唔到嘅欄位寫「其他」，同發佈頁一致 |
| 安全性   | 20      | 20      | 只係顯示文字，React 會 escape                                                 |
| 可維護性 | 20      | 20      | 刪咗 `fieldLabel` 同 `zhHK` import，標籤只喺 `changeFields.ts` 一個地方       |
| 測試覆蓋 | 15      | 15      | model unit + `HistoryRow` render test + e2e 斷言                              |
| 性能     | 10      | 10      | 每個 arc group 喺 `entries` 做一次線性搜尋，數量細                            |
| 代碼風格 | 10      | 10      | 跟現有寫法                                                                    |
| **總分** | **100** | **100** | 結果：✅ pass                                                                 |

## 🔴 / 🟡

冇。

## 🟢 / Observation

- **S-996** `HistoryRow` 狀態 pill：`.pill` 係 `white-space: nowrap`（`mockup.css`），而 `.hist-row .changes` 第 4 欄係 `auto`、名欄係 `minmax(0, 1fr)`（`theme.css`），所以欄位 list 長嘅時候會擠扁名欄，甚至溢出行。L2：用 Chromium 載入 admin 全部 CSS 量度，44 字 pill（「配色、簡介；戀愛後二分一：簡介、聲演、各集標題；我心不死：簡介、聲演、各集標題、檔案時間」）：行闊 1000px 時名欄得返 132px；行闊 700px 時名欄 = 0，`scrollWidth` 854 > 700，溢出 154px。舊版用原本 key（`arcs.<id>.<key>`）一樣長，所以唔係 regression；冇 AC 講明長度（冇 L1），所以係 🟢。建議喺同一個 PR 修：加 `.hist-row .changes .pill { white-space: normal; }` 等佢換行（推薦，全部欄位都睇到），或者 `max-width` 加 ellipsis 加 `title`
- **S-997** `historyModel.ts` `itemStatusOf(item, entries = [])`：production 只有 `ChangeLine` 一個 caller，佢有傳 `entries`；default 只係方便 `historyModel.test` 唔使傳。之後新 caller 漏傳嘅話唔會報錯，短篇會靜靜雞顯示 id 而唔係短篇名。`editFieldsText` 本身係 required。建議改做 required，test 明確傳 `[]`
- **S-998** `e2e/selectiveChecks.mjs`：註解同 brief 寫「只出一次」，但係 code 用 `.first().waitFor()`，冇斷言次數；只係檢查冇 `theme`。如果要鎖住「唔重複」（之前 revert 咗嗰個 span），應該加 `expect count === 1`
- Observation：pill 嘅短篇名用**而家**載入嘅 `entries`，短篇後來改名或者刪咗，舊記錄會顯示新名或者 id。縮圖 `thumbOf` 都係咁做，可以接受

## Admin 書面語

diff 冇改 `apps/admin/src/i18n/zh-HK.ts`，冇新 aria-label / tooltip / toast；「其他」用返現有 `fields.other`。`writtenChinese.test` pass。

## ✅ 做得好嘅地方

- 一個 SSoT：history 同確認發佈頁共用 `editFieldsText`，之後加欄位標籤只改一處
- 用戶指出重複之後 revert 咗第二個 span，冇喺同一行出兩次
- `HistoryRow.test` 用 `satisfies ChangeItem`，type 有檢查，亦斷言冇原本 key

## 修訂代碼（建議，非 block）

```css
/* theme.css — S-996：history 狀態 pill 欄位 list 長就換行，唔好擠扁名欄 */
.hist-row .changes .pill {
    white-space: normal;
}
```

## Handoff receipt

```yaml
HANDOFF_RECEIPT:
    agent: code-reviewer
    status: pass
    score: 100
    branch: feature/admin-history-change-fields
    commits: [8361683]
    hard_gates:
        lint: pass
        type_check: pass
        tests: pass
        coverage: pass
        no_critical: pass
        security_scan: n/a
    findings:
        critical: []
        warning: []
        suggestion: [S-996, S-997, S-998]
    next_action: proceed_to_qa
    context: >-
        T1. 0 blocking findings. S-996 (pill nowrap overflow, pre-existing, L2 measured)
        recommended to fix in this PR per same-session backlog rule; S-997/S-998 optional.
        e2e not run (QA/CI).
```

## Re-review — `fb91de1`（S-996 / S-997 / S-998）

只驗 `fb91de1` 嘅 diff。結果：✅ pass，三項都修好，冇新 🔴 / 🟡。

### Hard Gates

全部 pass。三條 command 分開跑，只用 `apps/admin/src` 路徑，冇觸發 hook。

- `npx eslint apps/admin/src/features/history apps/admin/src/styles/historyPill.node.test.ts`：exit 0；`npx prettier --check` 檢查 `history`、`theme.css`、`historyPill.node.test.ts`：pass。`e2e/selectiveChecks.mjs` 由 developer 嘅 repo-wide `npm run lint` 覆蓋
- `npx tsc -b apps/admin`：exit 0（`entries` 改做 required 之後，冇 caller 漏傳）
- `npx vitest run apps/admin/src/features/history apps/admin/src/styles/historyPill apps/admin/src/i18n/writtenChinese`：8 files，40 tests pass
- Coverage `historyModel.ts`：lines 96%，branches 82.1%
- 冇跑 full suite 同 e2e（Hard Rule #7）

### 逐項

- **S-996 ✅** `theme.css` 加 `.hist-row .changes .pill { max-width: 40ch; white-space: normal; }`。`fb91de1~1` 嘅 `theme.css` 冇呢條 rule，所以 `historyPill.node.test.ts` 喺修之前會 fail。佢跟現有 `styles/*.node.test.ts` 嘅做法。L2：用 Chromium 載入 admin 全部 CSS 再量度（名「蘭茜夫人劇場 › 戀愛後二分一」）：

    | 行闊   | pill                      | 修之前：名欄 / 溢出 | 修之後：名欄 / 溢出 | pill 尺寸        |
    | ------ | ------------------------- | ------------------- | ------------------- | ---------------- |
    | 1000px | 44 字（兩個短篇）         | 132px / 冇          | 366px / 冇          | 310 × 39px       |
    | 700px  | 44 字（兩個短篇）         | 0 / 154px           | 66px / 冇           | 310 × 39px       |
    | 700px  | 「配色、簡介」            | —                   | 300px / 冇          | 76 × 21px        |
    | 700px  | 「＋2 集 · 已上架」（ok） | —                   | 267px / 冇          | 109 × 21px，一行 |

    短 pill 都保持一行，冇受影響。

- **S-997 ✅** `itemStatusOf(item, entries)` 改做 required；`historyModel.test` 明確傳 `[]`；`tsc` 過
- **S-998 ✅** e2e 用 `count() !== 1` 就 throw，鎖住「配色、簡介」只出現一次（冇再跑 e2e，屬 QA / CI；developer 報 `e2e:admin` pass）

### Observation（唔 block，唔開 ID）

- 行闊 420px 時，名欄連短 pill 都變 0。原因係 `56px 28px minmax(0, 1fr) auto` 呢個 grid 本身，修之前已經係咁，同今次改動無關；手機版 layout 由 `theme.css` `@media (max-width: 719.98px)` 處理

### 評分

100 / 100，冇變。

### Handoff receipt（re-review）

```yaml
HANDOFF_RECEIPT:
    agent: code-reviewer
    status: pass
    score: 100
    branch: feature/admin-history-change-fields
    commits: [8361683, fb91de1]
    hard_gates:
        lint: pass
        type_check: pass
        tests: pass
        coverage: pass
        no_critical: pass
        security_scan: n/a
    findings:
        critical: []
        warning: []
        suggestion: []
        resolved: [S-996, S-997, S-998]
    next_action: proceed_to_qa
    context: >-
        Re-review of fb91de1 only. S-996/S-997/S-998 verified fixed; 700px row re-measured
        in Chromium (no overflow, name 66px, was 0 with 154px overflow). e2e not run (QA/CI).
```
