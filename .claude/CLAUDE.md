# 903-player — Project Rules

## QA / Validation Gate

跟 ai-dev-team `skills/sw-validation-gate/SKILL.md`（Verification Ledger + S1 / S2 / S3）。ledger 工具喺 repo root 跑：
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/qa-ledger.sh" <impact|freeze|status> …`

| 項目                  | 設定                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger                | `.proj-docs/qa/verification-ledger.tsv`（tracked）                                                                                                                                          |
| Frozen plans          | `.proj-docs/qa/plans/<chain_id>.md`（chains：`pwa-shell` `ui-foundation` `player-core` `catalog-data` `drama` `mini-player` `home` `show-today-page` `card-zoom` `bookmark` `coming-soon`） |
| Known issues          | `.proj-docs/qa/known-issues.md`                                                                                                                                                             |
| S1 / S2 `impact` base | integration branch 係 `main`（冇 `develop`）：`impact --since "$(git merge-base HEAD origin/main)"`                                                                                         |
| S3 `impact` base      | 上次 release tag；未有 tag 時用 `main` 上面最後一個改 `package.json` version 嘅 commit：`impact --since "$(git log -1 --format=%h -G'"version"' origin/main -- package.json)"`              |
| Unit（全部）          | `npm test`（= `vitest run`）；單檔 / 單 folder：`npx vitest run <path>…`                                                                                                                    |
| E2E（全部）           | `npm run e2e`（= `npm run build -- --mode e2e` + `node e2e/run.mjs`，自己起 vite preview，port 4173，`E2E_PORT` 可改）                                                                      |
| E2E 單檔              | `e2e/*.mjs` 嘅 section module 唔可以單獨跑，入口只有 `node e2e/run.mjs`（要先 `npm run build -- --mode e2e`）；plan 列嘅係對應 section                                                      |
| S3 可引用嘅 CI        | `.github/workflows/ci.yml`（非 main push：lint、unit、build、e2e；淨係改 docs 嘅 push 由 `changes` job 跳過，跳過當 Success）；同一個 SHA 綠咗就引用個 run，唔重跑                          |
| Cloud sandbox         | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（預裝 Chromium 同鎖住嘅 Playwright 唔夾時用）                                                                                      |

## Motion / 減少動態（用戶 2026-11-04 決定：以後同類情況唔使再問）

- 新動畫一律跟 app 現有統一做法：CSS 動畫放喺 `@media (prefers-reduced-motion: no-preference)`（或者用 `reduce` 關掉），設定一改即刻生效；JS 喺動畫開始嗰刻先叫 `prefersReducedMotion()`（`src/utils/motion.ts`），唔 cache 之前 render 嘅值
- 減少動態 = 唔播動畫、直接切換；唔可以因為等 `animationend` 而令元素卡住
- 時間 / easing 用 `tokens.css` 現有過場 token（`--view-transition-*`）

## 回覆語言（用戶 2026-11-04 決定）

- 同用戶嘅所有回覆一律用繁體中文（廣東話書面語）；code、指令、技術名詞先用英文
- 收到英文嘅 subagent 報告、GitHub 通知、CI log 之後都照用中文回覆，唔好跟住轉英文
- PR description、commit message 照舊用英文；repo 入面其他文件跟現有慣例
