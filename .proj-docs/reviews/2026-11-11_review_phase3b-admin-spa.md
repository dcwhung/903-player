# Code Review — 2026-11-11 — Phase 3b：`apps/admin` SPA + Worker static assets + 退役 ops 頁

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/charming-heisenberg-8z30x3` `218f6f1..3283bb5`（8 commits：`2e8858e` scaffold、`8acb175` 列表、`25700e6` 節目編輯、`9cef899` 廣播劇編輯、`d77ee57` e2e、`ae64b1e` Worker assets + 退役 ops、`1663b1c` docs、`3283bb5` login 置中 + roller focus）
- SSoT（L1）：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3b（決定表、UX 步數表）、Design Origin `mockup: _mockups_/admin/index.html`（v16）、`global-rules.md` §Design-Source Binding / §PWA Layout / §UX Flow & Icon-First、`.claude/CLAUDE.md` Motion
- Tier：T3（新 app、Worker 出 assets、deploy workflow 改動、刪 ops 頁）
- 總評：結構、i18n（TSX 冇 hardcode 中文）、same-origin fetch、冇 `innerHTML`、WebP + `createImageBitmap` decode（S-795）、app shell `100dvh`、reduced motion、dnd 鍵盤、`wrangler.toml` assets 設定全部跟 plan。三個 🟡：api 版本冇 bump（W-708）、R2 資料夾 `<select>` 一按方向鍵就配對（W-709，偏差 7）、session 過期時編輯頁只出英文 `not logged in`（W-710）

## Hard Gates

- Lint：`npm run lint`（eslint + `prettier --check .`）exit 0；admin `.ts` ≤ 30 行、`.tsx` ≤ 50 行 / 檔 ≤ 150 行規則已入 `eslint.config.js`
- Type：`npx tsc -b` exit 0（包 `apps/admin`）
- Tests（只跑相關）：`npm test -- apps/admin apps/api` → 43 檔 264 pass；冇跑 full suite；admin e2e 被 `reviewer-test-scope` hook 擋（屬 QA / CI，CI 跑緊 `3283bb5`）
- Build：`npm run build:admin` OK（JS 406 kB / gzip 129 kB）
- Coverage：`vitest related --coverage`：`api/client.ts` 97.8%、`entryDraft.ts` 100%、`persist.ts` 80%、`model/raw.ts` 92.6%（lines）；其餘 `*Model.ts` 全部有 unit test。成個 admin project 一次量被 hook 擋
- Security：新依賴（`@dnd-kit/*`、`lucide-react`）`npm audit --omit=dev -w apps/admin` 0 vulnerabilities，MIT / ISC
- No Critical：pass

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                            |
| -------- | ------ | ------- | ----------------------------------------------- |
| 正確性   | 15     | 25      | W-709（-5）、W-710（-5）                        |
| 安全性   | 20     | 20      | same-origin cookie、冇 HTML sink、上載前 decode |
| 可維護性 | 15     | 20      | W-708（-5）                                     |
| 測試覆蓋 | 15     | 15      | plan「3b 測試」列嘅 unit / component case 都有  |
| 性能     | 10     | 10      | 每頁一個 bundle；預覽 debounce 300 ms           |
| 代碼風格 | 10     | 10      | lint / prettier 過；常數有名                    |
| **總分** | **85** | **100** |                                                 |

**結果：⚠️ warn**

## 🟡 W-708 `apps/api` 版本冇 bump（仍然係 `0.4.0`）

- 位置：`apps/api/package.json`（`apps/admin/vite.config.ts` `__API_VERSION__` 讀佢做「Admin vX」pill）
- L1：`sw-git-flow` §Version Bump「所有改動預設都要 bump」；plan §拆 PR「pill 顯示 api 版本（同一個 Worker deploy，一個版本號就夠）」
- L2：`git diff 218f6f1..HEAD -- apps/api/package.json` 空；`origin/main` 已經係 `0.4.0`（PR #200 已 deploy）
- L3：3b deploy 之後 Worker 換咗 assets、退役 ops 頁，`/api/health` 同 pill 都仲講 0.4.0，分唔到新舊 deploy
- 方案 A（推薦）：`apps/api` 0.4.0 → **0.5.0**（MINOR：新 admin UI），`package-lock.json` 同步
- 方案 B：0.4.1（PATCH）。唔建議：新功能應該 MINOR

## 🟡 W-709 R2 資料夾 `<select>` 用方向鍵就即刻配對（偏差 7）

- 位置：`apps/admin/src/features/dramas/MissingFolder.tsx` `onChange={(e) => void onPick(e.target.value)}` → `pairFolder` + 自動 rescan
- L1：WCAG 2.2 SC 3.2.2 On Input（`global-rules.md` Accessibility：鍵盤導航必查）；plan §4 API「配對資料夾 … 之後自動 rescan 嗰套」（會寫 D1）
- L2：本機 Playwright Chromium（臨時 script，跑完已刪）：focus 一個未打開嘅 `<select>` → `ArrowDown` → `change` 觸發 1 次、value = 第一個資料夾
- L3：鍵盤用戶想睇下有咩選擇，一按 ↓ 就將劇配咗第一個資料夾，掃描結果寫入 D1；配對之後「需要處理」行消失，UI 冇第二個入口改返
- 方案 A（推薦）：`<select>` 只改 local state，旁邊加「配對」掣（或者揀完開 `ConfirmDialog`「將 X 配對到 Y/？」）；`MissingFolder` 加 component test（揀咗未撳掣唔會 call API）
- 方案 B：保留即時配對，但改用 listbox / combobox（Enter 先 commit）。工作量大，唔建議

## 🟡 W-710 Session 過期時，儲存只顯示 server 英文錯誤，冇 login 出路

- 位置：`apps/admin/src/features/editor/entryDraft.ts` `problemOf`（冇 `UnauthorizedError` 分支）→ `EditorNotices` `failed` 顯示 `problem.message`；`AuthGate` 只喺載入時檢查 `/api/me`
- L1：`api/client.ts` 檔頭「401 → login」；plan §3b「fetch wrapper（… 錯誤型別）」+ i18n 規則（UI 文字經 `t()`）
- L2：code path：`auth/middleware.ts` 回 `{ error: 'not logged in' }` 401 → `errorOf` → `UnauthorizedError` → `problemOf` 落 `failed` → 畫面顯示 `not logged in`
- L3：編輯到一半 session 到期，撳儲存見到英文錯誤；用戶要自己搵路重新登入，離開頁面就冇咗未存嘅改動
- 方案 A（推薦）：`problemOf` 加 `{ type: 'unauthorized' }`，`EditorNotices` 顯示 `t('editor.sessionExpired')` + 「重新登入」連結（`target="_blank"` 開 `/auth/google/start`，登入完返嚟再撳儲存，draft 保留）；排程 / 重排 / 上載共用同一個 problem 型別
- 方案 B：`AdminData` 有任何 401 就成個 app 返 `LoginScreen`。簡單，但 draft 會冇

## Developer 報嘅偏差（逐條判斷）

| #   | 偏差                                          | 判斷                                                                                                           |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 劇 ＋ 開解釋對話框 + 重新掃描                 | 接受。plan 決定「新資料夾自動建 draft 劇」，冇手動建劇路徑；對話框有 `aria-modal`、Esc（S-811 focus 細節）     |
| 2   | 節目 ＋ → `/shows/new` 多咗名稱 + 錄音檔時間  | 接受。mockup 只係話列表 / 編輯「唔顯示錄音檔時間」；新節目冇 `fileTime` 就砌唔到音檔 URL，淨係新增時出合理     |
| 3   | 下架短篇存排程順手 PUT 轉上架（兩個 request） | 接受。第二步失敗會出錯誤、短篇仲係「下架」（看得到），重試會 412 → 重新載入；長遠 server 一個 batch 做 → S-803 |
| 4   | 422 只顯示總結                                | 接受。API `details` 係字串，冇欄位 key；client 已做 ID / 各集標題欄位驗證                                      |
| 5   | Draft 劇另列「未上架」、唔可以拖              | 接受。order API 拒 draft，plan「下架嘅固定排最底」同一精神；mockup 冇但係唔超出 delta                          |
| 6   | 版本 pill 橙色改 `#c2410c`                    | 接受。為 AA 對比，token 仍然喺 `tokens.css`（`--brand-admin`）                                                 |
| 7   | 揀 R2 資料夾即刻配對                          | **要改** → W-709                                                                                               |

Developer 報嘅風險：改各集標題影響 `{title}` 檔名（已有提示、server 422 會擋 missing episode → 接受）；改短篇 ID 唔搬 `schedules` → S-804；排程儲存要其他 tab 冇未存改動（已有提示、掣 disabled → 接受）；dnd 鍵盤（`SortableList.test.tsx` 其實有 Space / ↓ / Esc component test，加埋 e2e → 接受）

## 其他檢查（冇問題）

- `wrangler.toml`：`directory = "../admin/dist"`、`not_found_handling = "single-page-application"`、`run_worker_first = ["/api/*", "/auth/*", "/catalog/*"]` 同 plan 一字不差；`/auth/google/callback` 照 redirect `/`
- 退役 ops 頁：`apps/api/public/*` + `scripts/opsPage.test.ts` 刪晒；`deniedPage` 改 inline style（常數經 `raw()`，email 經 `html` escape）；README / import workflow 文字同步
- `apps/api/vitest.config.ts` `mkdirSync('../admin/dist')`：只為 wrangler 唔報錯，`dist/` 已 gitignore
- CI：`check` 加 `build:admin`、`e2e` 加 `e2e:admin` + screenshot path；deploy：paths 加 `apps/admin/**`、`wrangler deploy` 前 build（`working-directory: .` 正確覆蓋 job default `apps/api`）
- Security：`credentials: 'same-origin'`；R2 名 / 標題全部經 React text node；縮圖 URL 經 CSSOM `style`，冇 HTML sink；上載前驗 type + decode + 尺寸，server 照驗
- Motion：CSS 動畫全部喺 `prefers-reduced-motion: no-preference`；`SortableItem` / `scrollBehavior` 每次 render 先讀 `prefersReducedMotion()`
- Layout：`.shell` `100dvh`、nav 固定、內容區 `overflow-y: auto`；< 720px 淨係出轉橫提示
- Icon-only 掣（⠿、✎ / ＋、⟳）全部有 `aria-label`；UX 步數同 plan 表一致

## 🟢 Suggestion / Observation（入 backlog，唔扣分）

- S-803 `features/dramas/useScheduleSave.ts`：排程 + 轉上架可以由 server `PUT …/schedule` 加 `enable: true` 喺同一個 D1 batch 做（偏差 3）
- S-804 `features/dramas/ArcIdField.tsx`：短篇有排程時改 ID，`schedules` 行留喺舊 ID（日子喺 definition 照留）；有排程就鎖 ID，或者 server 改名時搬 `schedules.arc_id`
- S-805 `ui/imageUpload.ts` `SLOT_SIZES` 同 `apps/api` `ASSET_DIMENSIONS` 重複；抽去 `packages/catalog` 共用，順手加 `ASSET_MAX_BYTES` 本機檢查
- S-806 `ui/SortableItem.tsx` `SORT_TRANSITION` 240 ms / easing 抄 `--motion-base` / `--motion-ease`；`mockup.css` spinner `0.8s` hardcode
- S-807 plan §3b.3 嘅 QA chain `admin` 未加：`.claude/CLAUDE.md` chain 清單 + `.proj-docs/qa/plans/admin.md`（QA S1 可以一齊做）
- S-808 `deploy-api.yml`：admin build 放喺 D1 migration 之前（build 失敗唔會留低半套 deploy）；本機跑完 api test 再 `wrangler deploy` 會出空 SPA（README 有寫，可以喺 deploy script 檢查 `index.html`）
- S-809 `app/LoginScreen.tsx`：login 完一律返 `/`，深連結（`/dramas/x/schedule`）冇咗
- S-810 TDD：8 個 commit 每個 test 同實作一齊入，睇唔到紅燈 commit；請 developer 補一句 TDD 執行說明
- S-811 `features/lists/NewDramaDialog.tsx`：冇 Tab 循環同關閉後 focus 返 ＋ 掣（`ConfirmDialog` 有）；可以共用同一個 dialog shell

## ✅ 做得好嘅地方

- API wrapper 錯誤型別（412 / 422 / 409 publish）清楚，412 提示 + 重新載入同 mockup ⑫ 一致
- Pure model（schedule / strip / todo / timeline / history / timeRoller）抽晒出嚟，全部有 unit test
- `vite.config.ts` dev proxy 改寫 Origin 過 same-origin 守門，本機開發唔使削弱 Worker

## 修訂代碼

```tsx
// MissingFolder.tsx（W-709）：揀咗先存 local，撳「配對」先 call API
const [picked, setPicked] = useState('');
// <select value={picked} onChange={(e) => setPicked(e.target.value)}> …
<button
    type="button"
    className="primary"
    disabled={picked === '' || busy}
    onClick={() => void onPair(picked)}
>
    {t('drama.pairFolder')}
</button>;
```

```ts
// entryDraft.ts（W-710）
export const problemOf = (error: unknown, now: Date = new Date()): Problem => {
    if (error instanceof UnauthorizedError) return { type: 'unauthorized' }; // EditorNotices：t('editor.sessionExpired') + 重新登入連結
    if (error instanceof VersionConflictError) return { type: 'conflict', at: now.toISOString() };
    if (error instanceof ValidationError) return { type: 'invalid', detail: error.details };
    return { type: 'failed', message: error instanceof Error ? error.message : String(error) };
};
```

```handoff-receipt
protocol: 1
status: warn
score: 85/100
stage: T3
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: "pass (npm test -- apps/admin apps/api: 43 files / 264; build:admin ok; admin e2e left to CI/QA)"
  coverage: "pass (client 97.8%, entryDraft 100%, persist 80%, raw 92.6%; all *Model.ts unit-tested)"
  no_critical: pass
  security_scan: "pass (@dnd-kit/*, lucide-react: 0 vulnerabilities, MIT/ISC)"
next_action: invoke_developer
next_agent: developer
branch: "claude/charming-heisenberg-8z30x3"
context: "Phase 3b warn 85: W-708 (apps/api still 0.4.0 -> bump 0.5.0), W-709 (MissingFolder select pairs on ArrowDown, reproduced in Chromium; add explicit 配對 button/confirm + test), W-710 (401 mid-session shows raw 'not logged in', no re-login path; add unauthorized problem type). Deviations 1-6 accepted, 7 must fix (W-709). S-803..S-811 to backlog. Fix commits 'fix: W-70x | ...'; re-review only those diffs. Report committed locally, not pushed (code CI running on 3283bb5)."
```
