# 903-player — Project Rules

## QA / Validation Gate

跟 ai-dev-team `skills/sw-validation-gate/SKILL.md`（Verification Ledger + S1 / S2 / S3）。ledger 工具喺 repo root 跑：
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/qa-ledger.sh" <impact|freeze|status> …`

| 項目                  | 設定                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger                | `.proj-docs/qa/verification-ledger.tsv`（tracked）                                                                                                                                                                                                                                                                                                                                                                     |
| Frozen plans          | `.proj-docs/qa/plans/<chain_id>.md`（chains：`pwa-shell` `ui-foundation` `player-core` `catalog-data` `drama` `mini-player` `home` `show-today-page` `card-zoom` `bookmark` `coming-soon` `repo-tooling` `api` `admin`）                                                                                                                                                                                               |
| Known issues          | `.proj-docs/qa/known-issues.md`                                                                                                                                                                                                                                                                                                                                                                                        |
| S1 / S2 `impact` base | integration branch 係 `main`（冇 `develop`）：`impact --since "$(git merge-base HEAD origin/main)"`                                                                                                                                                                                                                                                                                                                    |
| S3 `impact` base      | 上次 release tag；未有 tag 時用 `main` 上面最後一個改 `apps/player/package.json` version 嘅 commit：`impact --since "$(git log -1 --follow --format=%h -G'"version"' origin/main -- apps/player/package.json)"`                                                                                                                                                                                                        |
| Unit（全部）          | `npm test`（repo 根 = `vitest run`，root `vitest.config.ts` 嘅 projects 一次過跑 `apps/player` + `packages/catalog`）；單檔 / 單 folder：`npm test -- <path>…`（path 係子字串 filter，例如 `src/utils` 或 `apps/player/src/utils`、`packages/catalog/src/dramas`）；單一 workspace：`npm test -- --project @903-player/player`（或 `@903-player/catalog`），或者 `npm run test -w apps/player` / `-w packages/catalog` |
| E2E（全部）           | `npm run e2e`（= `npm run build -- --mode e2e` + `node e2e/run.mjs`（cwd = `apps/player`），自己起 vite preview，port 4173，`E2E_PORT` 可改）                                                                                                                                                                                                                                                                          |
| E2E 單檔              | `apps/player/e2e/*.mjs` 嘅 section module 唔可以單獨跑，入口只有喺 `apps/player` 跑 `node e2e/run.mjs`（要先 `npm run build -- --mode e2e`）；plan 列嘅係對應 section                                                                                                                                                                                                                                                  |
| S3 可引用嘅 CI        | `.github/workflows/ci.yml`（非 main push：lint、unit、build、e2e；淨係改 docs 嘅 push 由 `changes` job 跳過，跳過當 Success）；同一個 SHA 綠咗就引用個 run，唔重跑                                                                                                                                                                                                                                                     |
| Cloud sandbox         | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（預裝 Chromium 同鎖住嘅 Playwright 唔夾時用）                                                                                                                                                                                                                                                                                                                 |

## Ledger merge conflict（S-866，2026-11-12）

- Branch merge `main` 撞 `.proj-docs/qa/verification-ledger.tsv`：喺 repo root 跑 `node scripts/qa/ledger-merge.mjs`（預設 ours = HEAD、theirs = MERGE_HEAD），逐行（chain + stage + path）三方合併；exit 1 會列出兩邊都改咗、又對唔上而家個檔嘅行，嗰啲先要重新驗收再 freeze
- ❌ 唔好用 `git checkout --theirs` 之後 `qa-ledger.sh freeze <chain> <stage> … <淨係改咗嘅檔>`：freeze 會刪走同一個 chain + stage 嘅全部行，條鏈會截短（2026-11-12 PR #210 中過）
- 要 freeze 就要畀晒成條 chain + stage 嘅檔（`awk -F'\t' '$1=="<chain>" && $2=="<stage>"{print $3}'` 由 ledger 攞）
- ⚠️ `ledger-merge.mjs` exit 1 列出嘅行**唔會寫入**合併結果；freeze 時檔案清單 = ledger 現有嗰條 chain + stage 嘅行 **加返** script 列出嘅 path，否則嗰行會無聲無息消失（2026-11-12 #225 漏咗 coming-soon / repo-tooling 嘅 `package-lock.json`，#226 merge 補返）。Freeze 完同兩邊 parent 比對 chain + stage + path 冇少行先 commit
- Parallel lane：每個 PR merge 完，下一個先 merge `main` + 跑 script，等 CI 綠先 merge

## Parallel lane backlog（用戶 2026-11-12 決定）

- Lane（包括 Code Reviewer / QA）產生嘅 backlog item 要喺**同一個 session 清晒**：lane 自己喺 PR 內修（re-review 確認），或者由 main agent 開清理 lane；唔帶去下個 session
- 真係要用戶決定嘅先問；用戶話唔做 / 唔使落 backlog 嘅就唔記錄
- Lane 照舊唔改 `backlog.md`、只用預分配 ID 範圍；main agent 統一更新 backlog

## 淨改文件嘅 push（用戶 2026-11-06 決定）

- 淨改 docs 嘅 push CI 會跳過，但 main 嘅 Deploy 會跑全 repo `npm run lint`（包括 `prettier --check .`）：2026-11-06 v1.28.1 因為 QA 報告冇 format，Deploy #145 失敗
- Code Reviewer / QA（同任何 agent）push 報告或者其他 `.md` 之前，一定要對改咗嘅檔跑 `npx prettier --check <檔>`（唔過就 `--write`）
- Main agent merge PR 之前，喺 branch head 跑一次 `npm run lint`

## Code 同 docs 嘅 push 次序（用戶 2026-11-07 決定）

- `ci.yml` 有 `concurrency: cancel-in-progress`：code commit push 咗之後，CI 未跑完就再 push 淨改 docs 嘅 commit，會取消 code commit 嘅 e2e；而淨 docs 嗰次 run 又跳過 e2e，結果冇一個 run 跑過 code 嘅 e2e（2026-11-06 v1.28.4 中過，要 rerun 補）
- Code 同 docs 一齊 push；或者 docs 只喺本地 commit，等 code commit 嘅 CI（包括 e2e）跑完先 push
- Code Reviewer / QA 喺 code CI 跑緊時：報告只 commit、唔 push，由 main agent 喺 CI 完成後一次過 push；QA 引用 code commit 嗰個 run 做證據
- Main agent push docs 之前先睇最新 CI run：`in_progress` 就等，唔好 push

## Motion / 減少動態（用戶 2026-11-04 決定：以後同類情況唔使再問）

- 新動畫一律跟 app 現有統一做法：CSS 動畫放喺 `@media (prefers-reduced-motion: no-preference)`（或者用 `reduce` 關掉），設定一改即刻生效；JS 喺動畫開始嗰刻先叫 `prefersReducedMotion()`（`apps/player/src/utils/motion.ts`），唔 cache 之前 render 嘅值
- 減少動態 = 唔播動畫、直接切換；唔可以因為等 `animationend` 而令元素卡住
- 時間 / easing 用 `tokens.css` 現有過場 token（`--view-transition-*`）

## Admin 介面文字（用戶 2026-11-13 決定）

- Admin 介面所有文字（`apps/admin/src/i18n/zh-HK.ts`、aria-label、tooltip、dialog、toast）一律用**書面語**，唔准廣東話口語（嘅 / 咗 / 唔 / 喺 / 撳 / 嚟 / 冇 等）；`apps/admin/src/i18n/writtenChinese.test.ts` 鎖住
- `_mockups_/` 入面 admin 畫面嘅介面文字都要書面語；mockup 嘅說明（state-label、問題表）可以照用廣東話
- 掣字盡量短（「更換」「還原」），要分辨就用 aria-label 寫明對象（例如「更換首頁 Banner」）

## 回覆語言（用戶 2026-11-04 決定）

- 同用戶嘅所有回覆一律用繁體中文（廣東話書面語）；code、指令、技術名詞先用英文
- 收到英文嘅 subagent 報告、GitHub 通知、CI log 之後都照用中文回覆，唔好跟住轉英文
- PR description、commit message 照舊用英文；repo 入面其他文件跟現有慣例
