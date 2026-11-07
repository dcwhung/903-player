# 903-player — Project Rules

## QA / Validation Gate

跟 ai-dev-team `skills/sw-validation-gate/SKILL.md`（Verification Ledger + S1 / S2 / S3）。ledger 工具喺 repo root 跑：
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/qa-ledger.sh" <impact|freeze|status> …`

| 項目                  | 設定                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger                | `.proj-docs/qa/verification-ledger.tsv`（tracked）                                                                                                                                                                                                                                                                                                                                                                     |
| Frozen plans          | `.proj-docs/qa/plans/<chain_id>.md`（chains：`pwa-shell` `ui-foundation` `player-core` `catalog-data` `drama` `mini-player` `home` `show-today-page` `card-zoom` `bookmark` `coming-soon` `repo-tooling`）                                                                                                                                                                                                             |
| Known issues          | `.proj-docs/qa/known-issues.md`                                                                                                                                                                                                                                                                                                                                                                                        |
| S1 / S2 `impact` base | integration branch 係 `main`（冇 `develop`）：`impact --since "$(git merge-base HEAD origin/main)"`                                                                                                                                                                                                                                                                                                                    |
| S3 `impact` base      | 上次 release tag；未有 tag 時用 `main` 上面最後一個改 `apps/player/package.json` version 嘅 commit：`impact --since "$(git log -1 --follow --format=%h -G'"version"' origin/main -- apps/player/package.json)"`                                                                                                                                                                                                        |
| Unit（全部）          | `npm test`（repo 根 = `vitest run`，root `vitest.config.ts` 嘅 projects 一次過跑 `apps/player` + `packages/catalog`）；單檔 / 單 folder：`npm test -- <path>…`（path 係子字串 filter，例如 `src/utils` 或 `apps/player/src/utils`、`packages/catalog/src/dramas`）；單一 workspace：`npm test -- --project @903-player/player`（或 `@903-player/catalog`），或者 `npm run test -w apps/player` / `-w packages/catalog` |
| E2E（全部）           | `npm run e2e`（= `npm run build -- --mode e2e` + `node e2e/run.mjs`（cwd = `apps/player`），自己起 vite preview，port 4173，`E2E_PORT` 可改）                                                                                                                                                                                                                                                                          |
| E2E 單檔              | `apps/player/e2e/*.mjs` 嘅 section module 唔可以單獨跑，入口只有喺 `apps/player` 跑 `node e2e/run.mjs`（要先 `npm run build -- --mode e2e`）；plan 列嘅係對應 section                                                                                                                                                                                                                                                  |
| S3 可引用嘅 CI        | `.github/workflows/ci.yml`（非 main push：lint、unit、build、e2e；淨係改 docs 嘅 push 由 `changes` job 跳過，跳過當 Success）；同一個 SHA 綠咗就引用個 run，唔重跑                                                                                                                                                                                                                                                     |
| Cloud sandbox         | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（預裝 Chromium 同鎖住嘅 Playwright 唔夾時用）                                                                                                                                                                                                                                                                                                                 |

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

## 回覆語言（用戶 2026-11-04 決定）

- 同用戶嘅所有回覆一律用繁體中文（廣東話書面語）；code、指令、技術名詞先用英文
- 收到英文嘅 subagent 報告、GitHub 通知、CI log 之後都照用中文回覆，唔好跟住轉英文
- PR description、commit message 照舊用英文；repo 入面其他文件跟現有慣例
