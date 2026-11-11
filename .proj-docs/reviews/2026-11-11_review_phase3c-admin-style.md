# Code Review — 2026-11-11 — Phase 3c：admin UI 樣式 + 3b 用後回饋（api 0.6.0）

- 審閱者：Code Reviewer（subagent）
- 目標：`claude/charming-heisenberg-8z30x3` `0cfa53d..3f292fe`（code commits：`63eba68` 自動短篇 ID + confirm-id、`68d09c4` 樣式系統 / nav / tooltip / 403、`35c0c93`–`ffd0ef3` 列表 / 節目 / 短篇 / 圖片裁切、`1d684ac` 主題、`47cb2d5` 還原寫 D1、`414e411` 還原提示、`28efe7e` nav v4 FLIP、`3f292fe` e2e；docs / mockup commit 唔睇 code）
- SSoT（L1）：`.proj-docs/plans/2026-11-10_plan_phase3-admin.md` §3c、`mockup: _mockups_/admin-style/index.html`（v3 + ⑨ nav v4）、`mockup: _mockups_/admin/index.html`、`packages/catalog/src/dramas/schema.ts`（arc id 唯一）、`.claude/CLAUDE.md` Motion
- Tier：T3（API 寫 D1 新路徑、還原語意改變、新依賴、全 admin 樣式）
- 總評：還原（`rollback.ts`）設計清楚：先驗證 + ID 守衛先寫 D1，D1 單一 batch 樂觀鎖，發佈失敗 / 被拒寫返舊值；衝突路徑我喺 workerd 重現過，行為正確。自動 ID `<dramaId>-NN` 只派畀冇 id 嘅新短篇，避開已用，唔會郁已有 / 已發佈 ID。一個 🟡：改劇 ID 時 `<舊ID>-NN` 跟住改，會撞同劇已有嘅 `<新ID>-NN`（W-711，已重現）

## Hard Gates

- Lint / Type / Unit / Build / E2E：head `3f292fe` CI run `43031210297` 全綠（`npm run lint`、`npx tsc -b`、`npm test`、`build`、`build:admin`、`e2e`、`e2e:admin`），唔重跑
- Tests（本機只跑相關）：`npx vitest run` `apps/api/test/publish.test.ts`、`adminRoutes.test.ts`、`packages/catalog/src/scan/draft.test.ts`、`apps/admin/src/ui/imageCrop.test.ts`、`app/themePref.test.ts`、`ui/tooltipPlacement.test.ts` → 6 檔 98 pass
- Coverage：`restoredDefinition` 三種情況（snapshot 冇 / 有 / 新短篇）、R2 失敗寫返、draft 唔郁、confirm-id、rename 搬短篇 ID、`prepareImage` 全部分支都有 test；412 衝突路徑冇 test（S-813），我用臨時 test 驗過（見下）
- Security：`@jsquash/webp` 1.5.0 + `wasm-feature-detect` 1.10.1，Apache-2.0；`npm audit --omit=dev -w apps/admin` 0 vulnerabilities
- No Critical：pass

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                           |
| -------- | ------ | ------- | ---------------------------------------------- |
| 正確性   | 20     | 25      | W-711（-5）                                    |
| 安全性   | 20     | 20      | 403 email 經 `html` escape；冇 CSP（無衝突）   |
| 可維護性 | 20     | 20      | rollback / imageCrop / flip 拆得乾淨、有注釋   |
| 測試覆蓋 | 15     | 15      | 主要路徑有 test；412 路徑入 backlog            |
| 性能     | 10     | 10      | wasm 只喺瀏覽器出唔到 WebP 時先 dynamic import |
| 代碼風格 | 10     | 10      | CI lint / prettier 過                          |
| **總分** | **95** | **100** |                                                |

**結果：✅ pass**（W-711 建議 merge 前修）

## 🟡 W-711 改劇 ID 時自動短篇 ID 改名會撞同劇已有嘅 ID（✅ resolved `d6136d3`）

- 位置：`apps/api/src/admin/rename.ts` `withRenamedArcIds` / `renameStatements`（`ARC_ID_SQL`）
- L1：`packages/catalog/src/dramas/schema.ts:276` 同一劇 arc id 唔可以重複；episode ID `drama:<id>:<arcId>:<no>` 要唯一
- L2：臨時 workerd test（跑完已刪）：劇 `drama-01` 有 arcs `drama-01-01`、`lancy-01`（人手）→ `POST /api/entries/dramas/drama-01/rename { newId: 'lancy' }` → **200**，D1 definition arcs = `['lancy-01', 'lancy-01']`。兩個短篇都有 `schedules` 行時 → **500**（`schedules` PK 撞；batch rollback，D1 冇改）
- L3：第一種情況 D1 存咗 schema 唔收嘅 definition，之後發佈 422、編輯頁兩個短篇同 ID，admin 要自己估點解；第二種只得一個 500。觸發要劇未發佈過、人手 arc id 剛好係 `<新ID>-NN`，機會細，但正正係用戶問嘅「撞 ID」
- 方案 A（推薦）：`renamable()` 計好改名後嘅 arc id，有重複就回 409 `arc id <x> already exists`（admin 顯示經 `errorMessage`）；加 test（200 重複 → 409、schedules 500 → 409）
- 方案 B：撞嘅就唔改（保留 `<舊ID>-NN`）。唔建議：靜靜雞留低舊劇 ID 做前綴，同「跟住改」嘅預期唔一致

## 重點範圍檢查

- **`rollback.ts`**
    - 次序：`preflight`（`validateDocument` + 對 latest 嘅 ID 守衛）喺 `apply` 之前，422 / 409 都唔寫 D1 ✅
    - 樂觀鎖：`apply` 一個 `db.batch`，每行 `WHERE updated_at = expected`；任何一行 `changes = 0` → `revert` 寫返（只限我哋寫咗、之後冇人改嘅行，`expected = change.updatedAt`）→ 412。臨時 test：`apply` 前另一個 writer 改咗 `shows/newshow` → `RollbackConflictError`、`golden` 寫返 `enabled: false`、`newshow` 保留對方改動、publishes 冇多一行 ✅
    - 補償：`commitPublish` 回 `rejected`（中間有人發佈）或 throw（R2 失敗，`discardPublish` 已刪 publishes 行）→ `revert` ✅（`should put D1 back when writing the catalog fails` 有 test）
    - draft 唔郁、內容欄位唔郁、新增嘅設 `enabled: false` 而唔刪 → 集數 ID 仍喺 document，守衛過、收藏唔斷 ✅
    - 兩個剩餘 race 見 S-814（L3，唔扣分）
- **confirm-id / 自動 ID**：`withArcIds` 只派畀 `id === undefined` 嘅短篇，`used` 集合避開已用，起點 = 已有 id 數 → 唔會改已有 / 已發佈 ID ✅；`confirm-id` 只改 `scan_findings.detail`（`resolved_publish_id IS NULL`），idempotent，唔郁 entry ✅；rename 只限從未發佈（`wasEverPublished` → 409），所以 episode ID 穩定 ✅（除 W-711）
- **403 頁**：repo 冇任何 CSP（`grep` `content-security-policy` / `_headers` 都冇），inline `<script>` / `<style>` 唔受阻；script 只讀 `localStorage` 常數 key 再 `setAttribute`，`try/catch` 包住；email 經 hono `html` escape ✅。日後加 CSP 要記得 hash 呢段（S-815）
- **圖片裁切 / 編碼**：先驗 type → `createImageBitmap` decode（壞檔回 `undecodable`）→ `finally image.close()`；encode / wasm 載入失敗全部回 `encodeFailed`；object URL 喺 `pending` 換 / unmount 時 revoke ✅。超大圖記憶體見 S-816
- **a11y**：icon-only 掣（主題、收合、登出、還原、mini nav）全部有 `aria-label`；主題 segmented `role="group"` + `aria-pressed`；收合 `aria-expanded`；dialog focus 入取消、Tab 循環、Esc、關閉返 opener ✅。ImageSlot 見 S-817
- **Reduced motion**：`tip-in`、toast 動畫喺 `@media (prefers-reduced-motion: no-preference)`；`useFlip` 喺 layout effect（動畫開始嗰刻）先叫 `prefersReducedMotion()`；用 Web Animations + `Promise.allSettled` / timeout 收 `.flipping`，唔靠 `animationend` ✅；時間讀 `--motion-move` / `--motion-ease`（admin 自己嘅 token）✅

## Developer 報嘅偏差（逐條判斷）

| #   | 偏差                                           | 判斷                                                                                         |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `formatAirTime`「星期一至五（15:00 - 16:30）」 | 接受。plan §3c 列表一段就係呢個格式；只有 admin（`ShowList`、`ShowPreview`）用               |
| 2   | 改劇 ID 時 `<舊ID>-NN` 跟住改                  | 接受做法（只限未發佈），但要補撞 ID 檢查 → W-711                                             |
| 3   | banner 搬去 `apps/admin/public/banner.webp`    | 接受。固定檔名，403 頁（Worker 出）可以引用；`/banner.webp` 唔喺 `run_worker_first`          |
| 4   | WebP 後備 `@jsquash/webp` dynamic import       | 接受。只喺 `toBlob` 出唔到 WebP 時載（wasm 約 280–345 kB）；PR 要補「新增依賴」區塊（S-818） |
| 5   | Google Fonts 外部載入                          | 接受。plan「字體同 player」；`display=swap`，載唔到有 system font fallback                   |

## 🟢 Suggestion / Observation（入 backlog，唔扣分）

- S-812 `apps/admin/src/styles/theme.css`：`#ffffff`（第 60、100、107、115、124、186 行）同 `#0d1a2b`（457）hardcode，`tokens.css` 已有 `--on-nav` / `--on-primary` / `--on-accent`；兩個主題值一樣所以冇可見問題，改用 token
- S-813 `apps/api/test/publish.test.ts`：加還原 412 衝突 test（`apply` 前改一行 → 412、其他行寫返、冇新 publish）；我用 `DB` Proxy 喺第一個 `batch` 前插一句 UPDATE 驗過
- S-814 `rollback.ts` 剩餘 race（L3）：(a) 讀 entries 後、`commitPublish` 前有人改**冇喺 changes** 嘅 entry，發佈出去係舊內容（D1 啱，「待發佈」會顯示，再發佈就好）；(b) `purgeCatalogCache` 喺 R2 寫完之後 throw → `revert` 令 D1 同已上線 catalog 唔夾。可以將 purge 失敗只 log，唔 throw
- S-815 `apps/api/src/auth/deniedPage.ts`：日後加 CSP 要 hash `THEME_SCRIPT`（同 `apps/admin/index.html` 嗰段）；`auth.test.ts` hardcode `'Admin v0.6.0'`，下次 bump 會紅，改用 `pkg.version`
- S-816 `ui/imageCrop.ts`：冇原圖尺寸 / 檔案大小上限，超大圖 `createImageBitmap` 全解像度 decode 可以食好多記憶體；`onPick` 處理中（Safari 載 wasm）冇 busy 狀態，可以再揀一次
- S-817 `ui/ImageSlot.tsx`：`title` 改咗做 tooltip（`aria-hidden`），讀屏聽唔到「尺寸 / 自動裁切」提示；加 `aria-describedby`。`ImagePreviewDialog` 上載中 Esc 仍然會收埋 dialog（掣已 disabled），可以 busy 時忽略 Esc
- S-818 開 PR 時加「新增依賴」區塊（`@jsquash/webp` 1.5.0：原因 Safari 冇 WebP encode、替代方案、audit 0、Apache-2.0、lazy wasm 大小）
- S-819 TDD：feature commit 同 test 一齊入，e2e 另外 commit；睇唔到紅燈 commit，請 developer 補一句 TDD 執行說明

## ✅ 做得好嘅地方

- `rollback.ts` 檔頭講清楚語意同限制，`ConfirmDialog` `note` 將限制講畀用戶知
- `useDialogFocus` 抽出嚟畀兩個 dialog 共用；`flip.ts` 唔靠 `animationend`，有 timeout 保底
- `imageCrop.ts` 用 `ImageEnv` 注入 browser 功能，Safari 後備路徑可以 unit test

## 修訂代碼

```ts
// rename.ts（W-711）：改名後短篇 ID 有重複就 409
const duplicateArcId = (definition: Json): string | undefined => {
    const seen = new Set<string>();
    for (const arc of Array.isArray(definition.arcs) ? (definition.arcs as unknown[]) : []) {
        if (!isRecord(arc) || typeof arc.id !== 'string') continue;
        if (seen.has(arc.id)) return arc.id;
        seen.add(arc.id);
    }
    return undefined;
};
// renameRoutes.post(...)：計好 renamed definition 之後、batch 之前
const renamed = withRenamedArcIds(JSON.parse(existing.definition) as Json, target.id, newId);
const clash = duplicateArcId(renamed);
if (clash) return errorResponse(c, HTTP_STATUS.conflict, `arc id ${clash} already exists`);
```

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T3
ledger: n/a
hard_gates:
  lint: "pass (CI 43031210297 on 3f292fe)"
  type_check: "pass (CI tsc -b on 3f292fe)"
  tests: "pass (related: 6 files / 98 local; CI unit + e2e + e2e:admin green on 3f292fe)"
  coverage: "pass (rollback restore/revert, confirm-id, rename arc ids, prepareImage branches tested; 412 path verified ad hoc -> S-813)"
  no_critical: pass
  security_scan: "pass (@jsquash/webp 1.5.0 + wasm-feature-detect: 0 vulnerabilities, Apache-2.0)"
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/charming-heisenberg-8z30x3"
context: "Phase 3c pass 95, no blocking items. W-711 (rename.ts: renaming drama moves <old>-NN arcs to <new>-NN and can duplicate an existing <new>-NN arc -> 200 with duplicate arc ids, or 500 when both have schedules; reproduced in workerd) non-blocking per score rule but recommended to fix before QA S1 / merge: 409 + tests, commit 'fix: W-711 | ...', re-review only that diff. QA S1 chains admin, api, catalog-data after CI on head. Deviations 1-5 accepted (2 needs W-711). S-812..S-819 to backlog; S-818 = add new-dependency section to the PR. Report committed locally, not pushed."
```

## Re-review — 2026-11-11（`d6136d3` W-711）

只驗 W-711 嘅修正同佢嘅 diff，唔再搵新嘅 🟢。

- Hard gates：`npx tsc -b`、`npx eslint`（5 個改咗嘅檔）exit 0；`npx vitest run apps/api/test/adminRoutes.test.ts apps/admin/src/api/errorMessage.test.ts` 2 檔 31 pass；CI run `43034842298`（`d6136d3`）跑緊，由 QA 引用
- **W-711 ✅ resolved**：`renamable()` 喺任何 D1 寫入之前用 `duplicateArcIdAfterRename`（同 `withRenamedArcIds` 同一套改名邏輯）計改名後嘅短篇 ID，有重複就回 409 `{ error, arcId }`。`adminRoutes.test.ts` 加咗兩個 case：上次 review 重現嘅 200 + 重複 ID 而家回 409，D1 冇改；兩個短篇都有排程嘅 500 而家都係 409，`schedules` 冇改。Admin `errorMessage` 見到 409 + `arcId` 出 `t('editor.arcIdDuplicate')`（有 unit test），文字經 i18n

### 最終評分

| 維度     | 得分    | 滿分    |
| -------- | ------- | ------- |
| 正確性   | 25      | 25      |
| 安全性   | 20      | 20      |
| 可維護性 | 20      | 20      |
| 測試覆蓋 | 15      | 15      |
| 性能     | 10      | 10      |
| 代碼風格 | 10      | 10      |
| **總分** | **100** | **100** |

**結果：✅ pass**（W-711 已修；S-812–S-819 入 backlog）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T3
ledger: n/a
hard_gates:
  lint: "pass (eslint on changed files; full lint via CI 43034842298 on d6136d3, in progress)"
  type_check: "pass (npx tsc -b local)"
  tests: "pass (re-review related: 2 files / 31)"
  coverage: "W-711 paths covered: adminRoutes.test (409 no-schedule / with-schedules, D1 unchanged), errorMessage.test (zh message)"
  no_critical: pass
  security_scan: "n/a (no new dependencies in fix commit)"
next_action: invoke_qa
next_agent: quality-assurance
branch: "claude/charming-heisenberg-8z30x3"
context: "Phase 3c re-review pass 100: W-711 fixed in d6136d3 (rename refuses duplicate arc id with 409 + arcId before any D1 write; admin shows zh message). S-812..S-819 to backlog (S-818: new-dependency section in PR). QA S1 chains admin, api, catalog-data citing CI 43034842298 once green. Report committed locally, not pushed."
```
