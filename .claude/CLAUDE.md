# 903-player — Project Rules

## QA / Validation Gate

跟 ai-dev-team `skills/sw-validation-gate/SKILL.md`（Verification Ledger + S1 / S2 / S3）。ledger 工具喺 repo root 跑：
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/qa-ledger.sh" <impact|freeze|status> …`

| 項目                  | 設定                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ledger                | `.proj-docs/qa/verification-ledger.tsv`（tracked）                                                                                                                             |
| Frozen plans          | `.proj-docs/qa/plans/<chain_id>.md`（chains：`pwa-shell` `ui-foundation` `player-core` `catalog-data` `drama` `mini-player` `home` `show-today-page`）                         |
| Known issues          | `.proj-docs/qa/known-issues.md`                                                                                                                                                |
| S1 / S2 `impact` base | integration branch 係 `main`（冇 `develop`）：`impact --since "$(git merge-base HEAD origin/main)"`                                                                            |
| S3 `impact` base      | 上次 release tag；未有 tag 時用 `main` 上面最後一個改 `package.json` version 嘅 commit：`impact --since "$(git log -1 --format=%h -G'"version"' origin/main -- package.json)"` |
| Unit（全部）          | `npm test`（= `vitest run`）；單檔 / 單 folder：`npx vitest run <path>…`                                                                                                       |
| E2E（全部）           | `npm run e2e`（= `npm run build` + `node e2e/run.mjs`，自己起 vite preview，port 4173，`E2E_PORT` 可改）                                                                       |
| E2E 單檔              | `e2e/*.mjs` 嘅 section module 唔可以單獨跑，入口只有 `node e2e/run.mjs`（要先 build）；plan 列嘅係對應 section                                                                 |
| S3 可引用嘅 CI        | `.github/workflows/ci.yml`（非 main push：lint、unit、build、e2e；淨係改 docs 嘅 push 由 `changes` job 跳過，跳過當 Success）；同一個 SHA 綠咗就引用個 run，唔重跑             |
| Cloud sandbox         | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`（預裝 Chromium 同鎖住嘅 Playwright 唔夾時用）                                                                         |
