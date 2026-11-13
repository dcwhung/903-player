# Code Review — 節目 DELETE 守衛改用「曾經上架」（api 0.10.1、admin 0.3.1）

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`fix/show-delete-guard` @ `0a4ca1f`，`git diff origin/main...HEAD`（`282d8c1` fix、`0a4ca1f` version bump、`a27b283` merge main）
- Tier：T1（改一個 API 守衛同 admin 一個 flag，contract 唔變）
- 總評：邏輯改得啱。節目改用 `publishedFacts` / `indexOfFacts` / `isInIndex` 判斷，同列表「未上架 / 已下架」用同一條規則；最新 document 讀唔到照拒絕（S-844）；劇集同 `mayRelax` 冇郁。admin 嘅 `published === false` 同 API 判斷一致。有一項 🔴：`282d8c1` 將三個 worktree 嘅 `node_modules` symlink 一齊 commit 咗。Merge 入 `main` 之後，主 checkout 一 pull 就會被刪走 `node_modules`，換成指住自己嘅 symlink。

## Hard Gates

Lint、type、相關 unit test 都 pass，但係有 🔴，所以 No Critical gate fail。

- `npx eslint` + `npx prettier --check`，對象係改咗嘅 4 個 code 檔同 3 個 md：exit 0
- `npx tsc -b --noEmit`（`apps/api`、`apps/admin`）：exit 0
- `npm test -- apps/api/test/entries.test.ts apps/admin/src/features/shows/ShowEditor.test.tsx`：2 files，44 tests pass
- Mutation：拎走 `useShowEditor.ts` 嘅 `|| published === false`，新加嗰個 `it.each` 嘅 deletable 一格會 fail，試完已經還原。冇跑 full suite 同 e2e（Hard Rule #7）。Coverage n/a；冇新依賴

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                                         |
| -------- | ------ | ------- | -------------------------------------------------------------------------------------------- |
| 正確性   | 25     | 25      | 同列表規則一致；fail closed 保留；節目冇 episode ID，刪除唔影響 ID 守衛 / `lockedEpisodeIds` |
| 安全性   | 20     | 20      | 守衛只係放寬到「從未上架」，曾經上架嘅照 409                                                 |
| 可維護性 | 20     | 20      | 重用 `published.ts` 現有 helper，冇抄第二套規則                                              |
| 測試覆蓋 | 15     | 15      | API 兩邊（刪得 / 照擋）+ 下次 publish 200；admin 兩個值都有驗                                |
| 性能     | 10     | 10      | `publishedFacts` 一條 query，只喺 DELETE 節目時行                                            |
| 代碼風格 | 0      | 10      | C-015：commit 咗 `node_modules` symlink                                                      |
| **總分** | **90** | **100** | 結果：fail（有 🔴，修完 re-review）                                                          |

## 🔴 / 🟡

### C-015 🔴 `apps/admin/node_modules`、`apps/api/node_modules`、`apps/player/node_modules`：worktree 嘅 symlink 被 commit 咗

- L1：派工指示寫明「node_modules are symlinks; leave them untracked」；Review 清單 🔴「部署配置完整性」；`main` 從來冇 track 過 `node_modules`（`git ls-tree -r origin/main | grep -c node_modules` = 0）
- L2：`git ls-files -s` 見到三個 mode `120000` 嘅檔，target 係 `/home/user/903-player/apps/<app>/node_modules`，係 `282d8c1` 加嘅。`.gitignore` 嘅 `node_modules/` 只係 match directory，唔會 match symlink，所以 `git add -A` 會加埋佢哋。喺 scratch repo 重現過：`main` 有 ignored 嘅 `app/node_modules/` 目錄，merge 一個 track 咗 `app/node_modules` symlink 嘅 branch，git 冇任何警告，就刪走成個目錄，換成 symlink
- L3：PR merge 之後，`/home/user/903-player` pull `main`，三個 workspace 嘅 `node_modules` 會被刪走，變成指住自己嘅 symlink（loop），本地 test / dev 即刻壞。其他人 clone 落嚟就會係 dangling symlink。CI 嘅 `npm ci` 呢次過到，但唔代表本地冇事
- 方案 A（推薦）：`git rm --cached apps/admin/node_modules apps/api/node_modules apps/player/node_modules`，同時將 `.gitignore` 嘅 `node_modules/` 改做 `node_modules`（冇斜線，directory 同 symlink 都 match）。一個 commit 搞掂：`fix: C-015 | untrack worktree node_modules symlinks`。之後 worktree 用 symlink 都唔會再中
- 方案 B：只做 `git rm --cached`，`.gitignore` 唔改。改動最少，但下次喺 worktree 跑 `git add -A` 一樣會中

## 🟢 Suggestion / Observation（同一個 PR 處理；唔扣分）

- S-991 `apps/api/src/content/published.ts:4`：檔頭註解仲寫「守衛：最新 ok publish；…節目睇 document 有冇佢」，但 DELETE 節目已經改睇「曾經上架」。現在呢句只適用於 `mayRelax`。建議改做「DELETE：劇睇最新鎖住 ID，節目睇曾經上架（document 讀唔到照拒絕，S-844）；`mayRelax` 仍然睇最新 document 有冇佢」
- S-992 `apps/admin/src/features/shows/useShowEditor.ts:35`：節目嘅 `neverPublished` 而家包埋「以下架發佈過」，意思變咗做「可以刪除」，同名字唔夾，亦同劇集 `useDramaEditor.ts:30` 嘅 `neverPublished`（用嚟控制改 ID 同狀態 pill）唔同義。節目方面只有 `DeleteEntry` 用佢，可以改名做 `deletable`（`ShowEditorCard` 傳 `neverPublished={show.deletable}`），或者保留個名，但喺 JSDoc 第一句寫明「節目：= 可刪除」
- Observation（問題 1，re-create 同 ID）：一個從未上架嘅節目刪咗之後，用同一個 ID 再建、再以上架發佈，之後就受保護，啱。反過來，如果歷史上有其他節目用過同一個 ID 上過架，新建嗰個就永遠刪唔到。呢個係保守方向（fail safe），而且而家嘅規則下，上過架嘅節目根本刪唔到，所以正常流程唔會出現。唔使改
- Observation（問題 1，ID 守衛）：`validateDocument` 嘅 `episodeIds` 同 `lockedEpisodeIds` 只計劇集 episode（`dramas.catalogEpisodesOf`），節目冇 episode ID。所以刪一個從未上架嘅節目，唔會令下次 publish 撞 409，亦唔會少咗鎖住 ID。新 test 已經驗咗下次 publish 係 200
- Observation（問題 2，admin / API 一致）：兩邊都係 `publishedFacts` 呢個來源。只有兩個情況會唔夾：admin 列表係舊資料（中間有人發佈過），或者最新 document 讀唔到（API fail closed）。兩個情況 admin 都會出「刪除」掣，但 API 會回 409，即係由 API 守門，結果安全。唔使改
- Observation（問題 3）：冇新加 admin 介面文字（`已發佈的項目不可刪除。` 係現有 string）。新註解用專案慣用嘅廣東話，冇違反 admin 書面語規則（嗰條只管介面文字）。Version bump 齊：api 0.10.1、admin 0.3.1、lockfile 只改 version，兩份 CHANGELOG 都有寫

## ✅ 做得好嘅地方

- `blocksDelete` 冇另寫一套「曾經上架」，直接重用列表用嘅 `publishedFacts` → `indexOfFacts` → `isInIndex`，兩邊唔會再分歧。
- API test 由 document 查證「下架都照入 document」，再驗刪除 204 同下次 publish 200，正正重現咗用戶遇到嘅「ABC」情況。
- 刻意唔郁 `mayRelax`，喺說明寫低咗理由，scope 控制得好。

## 修訂代碼

C-015（只係 git index 同 `.gitignore`，唔改 code）：

```sh
git rm --cached apps/admin/node_modules apps/api/node_modules apps/player/node_modules
# .gitignore 第 1 行：node_modules/ → node_modules（directory 同 symlink 都 match）
sed -i '1s#^node_modules/$#node_modules#' .gitignore
git add .gitignore && git commit -m 'fix: C-015 | untrack worktree node_modules symlinks'
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 90/100
stage: T1
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: invoke_developer
next_agent: backend-developer
branch: "fix/show-delete-guard"
context: "show DELETE guard @ 0a4ca1f: logic correct and consistent with list status; C=1 (C-015 node_modules symlinks committed in 282d8c1), W=0, S-991..S-992 + 4 observations; fix in same PR then re-review C-015 only; report committed locally, not pushed (code CI running)"
blockers:
  - "C-015: untrack apps/{admin,api,player}/node_modules symlinks (and make .gitignore match symlinks)"
```
