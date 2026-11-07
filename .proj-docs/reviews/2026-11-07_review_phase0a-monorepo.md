# Code Review — 2026-11-07 — Backend Phase 0a：monorepo（npm workspaces，`apps/player`）

- 審閱者：Code Reviewer（subagent）
- 目標：`refactor/repo/monorepo-workspaces` @ `ee72715` vs `origin/main`（4 commits；733 檔，其中 716 個 R100 純 rename）
- SSoT（L1）：`.proj-docs/plans/2026-11-06_plan_backend-admin.md`「Monorepo 結構」；用戶決定「現有用戶零影響」、唔 bump version（前提 dist byte-for-byte 一樣）；`.claude/CLAUDE.md` QA 表
- Tier：T2（搬成個 app + 改 deploy / CI / Vercel 設定）
- Design Origin：none-required 成立（`.tsx` / `.css` 全部 R100，內容冇改）
- 總評：production 路徑（base、version 來源、PWA、Pages、Vercel）冇發現影響；2 個 🟡 都係 QA 工具鏈（S3 base 指令、ledger 路徑），唔影響用戶

## Hard Gates

all pass

- Lint：`npm run lint`（root ESLint + `prettier --check .`）exit 0
- Type：`npx tsc -b apps/player` exit 0
- Tests（Hard Rule 7，只跑相關）：`apps/player` 跑 `scripts/dramaFromFolder.test.ts`、`src/config/appVersion.test.ts`、`src/e2eSection.test.ts`、`src/e2eSrcConstants.test.ts`，4 檔 107 pass；root 轉發 `npm test -- src/config/appVersion.test.ts` 2 pass。冇跑 full suite / e2e（developer 已跑，CI 跑緊）
- Coverage：n/a（冇邏輯改動）；Security：n/a（lockfile 598 packages 版本 / integrity 不變，冇新依賴）
- No Critical：0
- Version：冇 bump（1.29.0）——用戶決定，main agent 已核 dist 77 檔 sha256 一樣

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                 |
| -------- | ------ | ------- | ------------------------------------ |
| 正確性   | 25     | 25      | production build / deploy 路徑全部對 |
| 安全性   | 20     | 20      | 冇新依賴；audit 前後一樣             |
| 可維護性 | 15     | 20      | W-700                                |
| 測試覆蓋 | 10     | 15      | W-701                                |
| 性能     | 10     | 10      | 冇相關                               |
| 代碼風格 | 10     | 10      | lint / prettier 過；size rule 仍生效 |
| **總分** | **90** | **100** |                                      |

**結果：✅ pass**（兩個 🟡 改動細，建議 merge 前一齊修）

## 重點逐項

1. **Production**：`vite.config.ts` 冇改，`new URL('./package.json', import.meta.url)` 而家讀 `apps/player/package.json`（1.29.0）；`BASE_PATH` 照用 `process.env.VERCEL`。`deploy.yml` `npm run build` 經 root 轉發，artifact 改 `apps/player/dist`；`vercel.json` install / build / output 齊，`ee72715` 只改 `refactor/**` 一行（merge 前要 revert）
2. **Root scripts**：`npm run X -w apps/player --` 尾 `--` 令 `npm test -- <path>`、`npm run build -- --mode e2e` 參數照傳（已實測）；`lint` / `format` 留 root 掃成個 repo 合理；root 冇 `version`，單一來源清楚
3. **ESLint / `.gitignore`**：`--print-config` 證實 `apps/player/src/App.tsx` 有 `max-lines-per-function` 50 + `max-lines` 150，`.ts` 30，`zh-HK.ts` `max-lines` off；`git check-ignore` 證實 dist、coverage、node_modules、`apps/*/e2e/screenshots/`、arcCover review 生成物都 ignore 到
4. **`import.meta.resolve`**：Node 22 實測 resolve 到 root `node_modules/@fontsource/poppins/400.css` 同 `vite/package.json`，`new URL('./' | 'bin/vite.js', …)` 正確
5. **CLAUDE.md**：只改 QA 表；S3 冇 `--follow` 見 W-700
6. **Raw 網址**：README 已改，舊網址 merge 後 404 見 S-751
7. **殘留舊 path**：root config / workflows 冇；CLAUDE.md 第 36 行 `src/utils/motion.ts` 見 S-753；QA plans / ledger 見 W-701

## 🟡 Warning

### W-700 — S3 `impact` base 指令冇 `--follow`，merge 後揀錯 commit

- 位置：`.claude/CLAUDE.md` QA 表「S3 `impact` base」
- L1：同一格定義「`main` 上面最後一個改 version 嘅 commit」
- L2：喺 HEAD 跑 `git log -1 --format=%h -G'"version"' HEAD -- apps/player/package.json` → `74b5842`（搬 folder，冇改 version）；加 `--follow` → `c3fdb4a`（真正 bump 1.29.0）
- L3：merge 後下次 S3 base 變成 `74b5842`，`74b5842` 本身（package.json / eslint / .gitignore 改動）唔入 impact 範圍
- 方案 A（推薦）：指令加 `--follow`（單一 pathspec 可用），一個字改動；用戶已批准改 QA 表
- 方案 B：merge 後打 `v1.29.0` tag，S3 改用 tag；要多一個 release 步驟

### W-701 — Verification ledger 同 11 份 frozen plan 仍然用舊 root path

- 位置：`.proj-docs/qa/verification-ledger.tsv`（1676 行）、`.proj-docs/qa/plans/*.md`
- L1：`sw-validation-gate` ledger（已驗 + 冇改 = 唔再驗）；CLAUDE.md QA 表「Frozen plans」
- L2：`origin/main` 上 11 條鏈嘅 S1 全部 FROZEN（今日 v1.29.0 recheck）；HEAD 跑 `qa-ledger.sh status` → 1630 行 `deleted`，其中 S1 987 行有 947 行係 R100 rename（hash 完全冇變）。11 份 plan 仍寫 `npx vitest run src/…`、`node e2e/run.mjs`，喺 repo 根跑會搵唔到檔
- L3：merge 後 11 條鏈全部 STALE，下次 QA 要全部重驗；plan 指令照抄會失敗
- 方案 A（推薦）：同一 PR 將 ledger 第 3 欄嘅 R100 path 加 `apps/player/` 前綴（hash 唔使改，仍然 FROZEN），plan 入面 path / 指令一齊改（plan 本身會變 STALE，要 QA 重 freeze plan 行）
- 方案 B：唔改 ledger，`known-issues.md` 記低「Phase 0a 之後首次 QA 全部重驗」，plan 留待下次 QA 更新

## 🟢 / Observation（已入 backlog）

- S-750 `apps/player/scripts/arcCover/{generate.py,review/build.py,tests/test_vignette.py}`：`REPO_ROOT` 而家其實係 `apps/player`（用法全部係 `src/…`，結果啱），名可改 `APP_ROOT`
- S-751 README：舊 raw 網址 `main/scripts/dramaFromFolder.mjs` merge 後 404；有人收藏舊指令會失敗，merge 後通知上載劇集嘅人
- S-752 root `typescript-eslint` 靠 `apps/player` 嘅 `typescript` hoist；加第二個 workspace 時考慮 root 自己宣告
- S-753 `.claude/CLAUDE.md` 第 36 行 `src/utils/motion.ts` 冇前綴（用戶只批 QA 表），下次改 CLAUDE.md 時補
- S-754 plan「風險」寫「Vercel dashboard 改 Root Directory」，實作改用 `vercel.json` 留 repo 根；如果照 plan 改 dashboard Root Directory 做 `apps/player`，`outputDirectory` / `-w apps/player` 會再相對 `apps/player` 解析而 build 失敗。plan 要同步改
- Observation：`ee72715`（TEMP Vercel preview）確認只改 `refactor/**` 一行，merge 前 revert

## ✅ 做得好嘅地方

- 716 個 R100 rename，blame / history 保留；lockfile 只加 workspace link，版本 / integrity 一個都冇變
- 相對 path 改動有註解講原因（README 留 root、`design/` 留 root、hoist）；e2e 改用 Node resolution 唔再寫死層數
- dist byte-for-byte 驗證（default + `VERCEL=1`）先決定唔 bump，符合用戶前提

## 修訂代碼

W-700（`.claude/CLAUDE.md` QA 表）：

```bash
# S3 impact base：--follow 令 git 跟住 rename，搵返真正改 version 嘅 commit
impact --since "$(git log -1 --format=%h --follow -G'"version"' origin/main -- apps/player/package.json)"
```

W-701（ledger 只改 R100 path，hash 照用）：

```bash
git diff origin/main..HEAD -M --name-status | awk -F'\t' '$1=="R100"{print $2"\t"$3}' >/tmp/map.tsv
awk -F'\t' -v OFS='\t' 'NR==FNR{m[$1]=$2;next} /^#/{print;next} ($3 in m){$3=m[$3]} {print}' \
    /tmp/map.tsv .proj-docs/qa/verification-ledger.tsv >/tmp/ledger.tsv && mv /tmp/ledger.tsv .proj-docs/qa/verification-ledger.tsv
```
