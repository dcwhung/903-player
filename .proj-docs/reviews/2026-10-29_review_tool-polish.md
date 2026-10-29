# Code Review — 2026-10-29 — tool polish（S-567 / S-570 / S-571 / S-572 / QA O-1 / O-2）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，`git diff 5a61176 f19d496`（merge `f19d496`）
    - `30883c5` fix(tools)：`vite/client` 型別搬去新 project `tsconfig.scripts-test.json`（S-567）
    - `66a2ab0` test(tools)：from-scratch round-trip 驗 `host: r2` + 網址前綴（S-570）
    - `745ac10` fix(tools)：寫入權限預檢 + 新 exit code `5`（S-571）
    - `09d2df3` fix(tools)：folder / 檔案路徑提示改準（S-572、QA O-1、O-2）
    - 改動檔：`scripts/dramaFromFolder.mjs`、`.d.mts`、`.test.ts`、`scripts/cardStackTokens.test.ts`、`scripts/launchThemeTokens.test.ts`（只改註解）、`tsconfig.json`、`tsconfig.node.json`、`tsconfig.scripts-test.json`（新）、`README.md`
- 來源：`reviews/2026-10-29_review_catalog-tools-rereview.md`（S-567）、`reviews/2026-10-29_review_cui-0008.md`（S-570–S-572）、`qa/2026-10-29_qa_cui-0008.md`（O-1 / O-2）
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；唔係 PWA 改動，PWA 檢查 n/a。
- Version：`package.json` 冇 bump（仍係 1.20.6）。純開發工具，app build 唔變，跟前幾份 catalog-tools review 先例，唔當 Warning。
- TDD：test 同實作同一個 commit；S-570 commit message 寫明 mutation（generator 出 `host: 'app'`）後 6/6 from-scratch case 紅。reviewer 另外做咗 S-567 嘅 mutation（見下），接受。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 C-008、W-495、S-572。今次用 **W-496**、**S-573–S-575**。
- 總評：5 項來源 item 全部做到，S-567 今次係真係鎖住行為（mutation 實證）。但 S-572 / O-2 新加嘅 `nearestExisting` 喺 **Windows 上一個唔存在嘅磁碟機 / 連唔到嘅 UNC 路徑會無限 loop**（W-496，regression：之前係 exit 2 + 清楚訊息）。另外 `--out` 喺預檢過咗之後先寫唔到（Windows ACL 等）仍然係 exit 4 + stack（S-573）。**92 分 ✅ pass**，但 W-496 建議喺下次派 script 畀用戶之前修。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                    |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `npx eslint scripts tests` exit 0；`npx prettier --check .` 嘅 11 個 warning **全部**喺 `.claude/worktrees/`（另一個 agent 嘅 worktree，唔屬呢批），repo 本身冇 warning |
| Type check    | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                     |
| Tests         | ✅ pass | `npx vitest run scripts src/catalog`：11 files / **281 tests** 全綠（QA 前次 271，+10），5.8 秒                                                                         |
| Coverage      | ✅ pass | `scripts/dramaFromFolder.mjs`：96.65% stmts / 86.41% branches / 97.61% lines（前次 96.26% / 85.71%）                                                                    |
| No Critical   | ✅ pass | 🔴 = 0                                                                                                                                                                  |
| Security scan | n/a     | 冇新依賴（`typescript` 本身已係 devDependency，只係多咗喺 test import）                                                                                                 |

---

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                |
| -------- | ------ | ------- | --------------------------------------------------- |
| 正確性   | 19     | 25      | W-496（Windows 無限 loop）、S-573（`--out` 遲失敗） |
| 安全性   | 20     | 20      |                                                     |
| 可維護性 | 20     | 20      |                                                     |
| 測試覆蓋 | 13     | 15      | S-574（TypeScript API test 冇明確 timeout）、S-575  |
| 性能     | 10     | 10      |                                                     |
| 代碼風格 | 10     | 10      |                                                     |
| **總分** | **92** | **100** |                                                     |

**結果：✅ pass**（hard gates 全 pass、≥ 90、冇 Critical）

---

## 逐項覆核

| Item  | 結果                   | 說明                                                                                                                                    |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S-567 | ✅ 修好                | 見下面「S-567 判斷」                                                                                                                    |
| S-570 | ✅ 修好                | from-scratch case 驗 `audio.host === 'r2'` + 每集網址由 R2 base 開頭；`decodedPath` 唔係由 base 開頭就 throw。即係前次推薦嘅方案 A      |
| S-571 | ✅ 修好                | 見下面「S-571 判斷」；殘餘 `--out` 遲失敗開 S-573                                                                                       |
| S-572 | ✅ 修好                | `--report` 係 folder → `--report "<dir>/report.txt"`；`--out` 係 folder → `--out "<dir>/<id>.drama.json"`。例子用引號包住，有空格照抄得 |
| O-1   | ✅ 修好                | 見下面「S-572 / O-1 判斷」                                                                                                              |
| O-2   | ⚠️ 修好但有 regression | 上層係檔案而家講「`…cover photo.jpg` 係一個檔案，唔係 folder」（C8 test）。但 `nearestExisting` 個 loop 冇終止條件，見 W-496            |

### S-567 判斷：`tsc -b` 有冇少驗檔？TypeScript API test 穩唔穩、快唔快？

- **冇檔被丟出所有 program**。reviewer 喺 `5a61176` 開 detached worktree，用 `tsc -p <config> --listFilesOnly` 列 `tsconfig.app.json` + `tsconfig.node.json`（前）同 app + node + scripts-test（後）嘅非 `node_modules` 檔案聯集：**前後都係 358 個，`diff` 完全一樣**。`scripts/*.test.ts` 由 node program 搬去 scripts-test program，佢哋 import 嘅 `src/**`、`tests/jsonSchemas.ts`、`scripts/socialMeta.ts` 等喺兩個 program 都有出現（重疊 15 個檔），冇問題。
- `tsconfig.scripts-test.json` 嘅 compilerOptions 同 `tsconfig.node.json` 逐項一樣，只係 `types` 多咗 `vite/client`、`tsBuildInfoFile` 唔同 —— strictness 冇降。根 `tsconfig.json` 有 reference，`tsc -b` 會行。
- **行為實證**（喺 scratchpad worktree 做，冇改 repo）：
    1. `scripts/probe.ts` 寫 `import.meta.env.BASE_URL` → `npx tsc -b` exit 2，`Property 'env' does not exist`（前次 S-567 嘅重現而家擋到）。
    2. 將 `vite/client` 加返入 `tsconfig.node.json` 嘅 `types` → 新 test **紅**。
    3. 拎走 `tsconfig.node.json` 嘅 `exclude` → `tsc -b` exit 2（test 檔用 `import.meta.env` 喺 node program 報錯），所以兩個 config 唔會靜靜雞夾錯。
- Test 設計穩陣：用真 `tsconfig.node.json` 經 `getParsedCommandLineOfConfigFile` 解析，加 probe 檔建成個 program，所以有人喺 `scripts/` 任何非 test 檔加 `/// <reference types="vite/client" />`，同樣會令 probe 冇錯而紅 —— 比淨係驗 config 字串嘅舊 test 強好多。`getPreEmitDiagnostics(program, probeFile)` 只攞 probe 嘅 diagnostics，其他檔有無關錯誤唔會干擾。
- 速度：呢個 test 單獨 **1.3–1.4 秒**（建成個 program），成個 suite 5.8 秒，可以接受。不過 vitest 預設 timeout 5 秒，CI 機慢 / 平行跑多個 worker 時餘量唔算大 → S-574（🟢）。

### S-571 判斷：新 exit code `5` 值唔值得？`canWrite` 注入點喺單檔下載 script 啱唔啱？

- **Exit 5 合理**。舊行為係 exit 2，而 README 寫「2 = 冇寫檔」，直接矛盾；只喺 README 加 footnote 嘅話，用戶（同將來嘅 wrapper）要讀字先知「2 有時其實寫咗」，失去 exit code 嘅意義。另一個選擇係回 0（drama.json 本身成功）—— 但會令「叫咗 `--report` 但冇報告檔」靜靜雞當成功。新 code 代價好細：`.d.mts` 型別、README 表、加一個 test 保證 `EXIT` 每個值都喺 README 表出現，三樣都做齊。`--verify` 失敗（3）+ 報告寫唔到時保留 3（3 已經表示「已寫檔」），blocked（1）時唔會聲稱寫咗 —— 兩條都有 test。設計清楚。
- **`canWrite` 注入點可以接受**。`run(argv, ioOverrides)` 本身已經有 `out` / `now` / `fetch` 三個注入點，`canWrite` 跟同一個模式，冇新概念；預設值 `accessSync(W_OK)` 只係 6 行，冇 export 新 API 畀用戶，單檔 script 冇變複雜。test 用 root 跑，`chmod` 擋唔到，唔注入就測唔到拒絕路徑，理由成立。
- 但要知 `accessSync(W_OK)` 嘅限制（commit 註解都有講）：reviewer 喺 container（root）實跑：
    - `--report /proc/r.txt` → 預檢過（root 對 `/proc` W_OK = yes），最尾寫失敗 → **exit 5** +「drama.json 已經寫好…唔使重行」✅ 兜底有效
    - `--out /proc/self/y.json` → 預檢擋到，exit 2 ✅
    - `--out /proc/y.json` → 預檢過，`writeFileSync` 失敗 → **仍然係 exit 4 + stack trace**。真用戶最可能撞到嘅係 Windows：Node 文件講明 `fs.access` 喺 Windows 唔反映 ACL，例如寫入 `C:\Program Files\…`。見 S-573（🟢：冇寫任何檔、冇資料損失，只係訊息 / exit code 唔準）。

### S-572 / O-1 判斷：預設輸出撞 folder 時提示 `--out "<另一個 folder>/<id>.drama.json"` 合唔合理？

- **合理**。O-1 嘅問題係舊例子叫人寫入 `xyz.drama.json/drama.json`（即係個撞名 folder 入面）。新訊息：
    - label 寫明「預設輸出檔（冇畀 --out）」，用戶先知道條路徑係 script 自己砌，唔係佢打錯；
    - 畀兩條出路：加 `--out` 揀第二度，或者將嗰個 folder 改名 / 搬走 —— 正係 QA 建議；
    - 例子保留 `<id>.drama.json` 檔名，用戶只要換 placeholder。
- 用 placeholder 而唔係真路徑係啱嘅：script 唔知用戶想放邊，作一個（例如 cwd 加尾綴）反而可能又撞名。placeholder 用 `/`，Node 喺 Windows 都接受 `/`，照抄得。C12（中文 + 空格劇名）有 test。
- 小觀察（唔開 item）：`<另一個 folder>` 有角括號，喺 PowerShell / cmd 若果用戶冇換 placeholder 就照抄，引號入面 `<` `>` 唔會變 redirect，只會報 folder 唔存在 → exit 2，安全。

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

#### W-496 — `nearestExisting` 喺 Windows 唔存在嘅磁碟機 / UNC root 無限 loop

- 位置：`scripts/dramaFromFolder.mjs` `nearestExisting`（約 983–987 行），由 `parentProblem` 呼叫
- 描述：`while (!existsSync(current)) current = dirname(current);` 靠「行到 root 一定存在」嚟停。POSIX `/` 一定存在冇事，但 Windows 嘅 root 未必存在：`path.win32.dirname('Z:\\') === 'Z:\\'`、`dirname('\\\\srv\\share\\') === '\\\\srv\\share\\'`（reviewer 用 `node -e` 驗咗）。用戶打錯磁碟機（`--out E:\x.json` 但冇插 USB）或者網絡 share 連唔到 → `isDirectory(parent)` false → `parentProblem` → **永遠唔返**，CPU 100%、冇任何輸出。
- 影響：中。屬 regression —— 改之前同一輸入係 `[錯誤] … folder 唔存在` exit 2。目標用戶主要用 Windows（README 有成段 Windows 指引），用戶只會見到 script「卡死」，要 Ctrl+C，亦唔知點解。冇寫檔，冇資料損失，所以唔係 Critical。
- 方案 A（推薦）：loop 遇到 `dirname(current) === current` 就停，回 `undefined`；`parentProblem` 收到 `undefined` 就用原本「folder 唔存在」訊息。將 `nearestExisting` 改做收 `exists` / `dirname` 參數（或者 export 一個 pure helper），test 用 `path.win32.dirname` + `() => false` 驗會停。改動細、POSIX 行為不變。
- 方案 B：限制最多行 `path.split(sep).length` 步。都會停，但意圖冇 A 咁清楚，而且仍然要另外處理 root 唔存在嘅訊息。
- 推薦 A。

### 🟢 Suggestion

#### S-573 — `--out` 預檢過咗但最尾寫唔到：仍然 exit 4 + stack

- 位置：`generateAndWrite` 寫 drama.json 嗰度（約 1104 行）
- 描述：`accessSync(W_OK)` 喺 Windows 唔反映 ACL（Node 文件明寫），root 亦會過；之後 `writeFileSync` 失敗會跌落 `reportInternalError` → exit 4「程式出錯，請將成段輸出傳返嚟」+ stack。reviewer 用 `--out /proc/y.json`（root）重現。
- 影響：低。冇寫任何檔；但 exit 4 叫用戶回報 bug，其實係權限問題。`--report` 嗰邊已經有 exit 5 兜底，`--out` 冇對應。
- 方案 A（推薦）：寫 drama.json 嗰句 try/catch，`EACCES` / `EPERM` / `EROFS` / `ENOSPC` 等轉做 `[錯誤] 輸出檔寫唔到：<path>（<code>）`，exit 2（冇寫檔，同 README 一致）；其他錯誤先照舊 exit 4。
- 方案 B：唔改流程，只喺 README exit `4` 加一句「`EACCES` / `EPERM` 開頭嘅係權限問題，揀另一個 folder」。零風險但要用戶睇字。

#### S-574 — TypeScript API test 冇明確 timeout

- 位置：`scripts/dramaFromFolder.test.ts` `should not give Node-run scripts vite/client types (import.meta.env)`
- 描述：建成個 `tsconfig.node.json` program，本機 1.3–1.4 秒；vitest 預設 5 秒。program 會跟 `scripts/`、`tests/`、`src/**/*.node.test.ts` 增長，CI 慢機 + 多 worker 時有機會 flaky。
- 方案 A（推薦）：`it(..., () => {...}, 20_000)`（常數命名，例如 `TYPECHECK_TIMEOUT_MS`），註解寫明係 TypeScript 建 program。
- 方案 B：只用 `parsed.options` + probe 建細 program（快好多），但會漏「其他檔有 triple-slash reference」呢種情況 —— 唔建議，現時嘅完整 program 先係 S-567 要嘅保證。

#### S-575 — exit code 唯一性 / README 表 test 偏弱

- 位置：`should say drama.json was written when only the report write fails at the end`、`should document every exit code in the README table`
- 描述：`Object.values(EXIT).filter((c) => c === EXIT.reportFailed)).toHaveLength(1)` 只驗 5 唔重複，其他值重複驗唔到；README test 嘅 `` `| \`${code}\`  |` `` 綁死 prettier 嘅兩格 padding，表格闊度一變（例如 code 欄加長）就假紅。
- 方案 A（推薦）：抽一個獨立 test：`expect(new Set(Object.values(EXIT)).size).toBe(Object.keys(EXIT).length)`；README 用 regex ``new RegExp(`\\|\\s*\`${code}\`\\s*\\|`)``。
- 方案 B：保留現狀，只改 README regex。

---

## ✅ 做得好嘅地方

- S-567 由「驗 config 字串」改做「用 TypeScript API 編譯真 config + probe」，係真正鎖住行為；commit message 解釋咗 triple-slash 點解唔得，下一個人唔會再行返轉頭。
- 新 tsconfig 冇偷偷放鬆 strict option；檔案覆蓋前後一樣（358 = 358）。
- `reportWriteFailed` 分清楚 drama.json 有冇寫：blocked run 唔會講「已經寫好」，避免用戶誤以為有輸出 —— 正係 S-571 最重要嘅用戶訊息問題，兩邊都有 test。
- README exit code 表有 test 保證同 `EXIT` 同步。
- 提示文字全部用引號包住路徑，C12（中文 + 空格）有 test，照顧到真用戶。
- `destinationProblem` 改收 target object（`label` / `path` / `folderHint`），每種目的地自己決定提示，冇再用 if-else 分 `--out` / `--report`。

---

## 修正優先順序

| 優先 | Item  | 建議時間                      |
| ---- | ----- | ----------------------------- |
| 1    | W-496 | 下次派 script 畀用戶之前      |
| 2    | S-573 | 可同 W-496 一齊（同一段流程） |
| 3    | S-574 | 有空                          |
| 4    | S-575 | 有空                          |

---

## 修訂後代碼（W-496 方案 A，節錄）

```js
/**
 * 路徑上面最近一個真係存在嘅地方；行到 root 都唔存在就回 undefined
 * （Windows 冇插嘅磁碟機 / 連唔到嘅 UNC：dirname('Z:\\') === 'Z:\\'，唔停會無限 loop — W-496）
 */
export const nearestExisting = (path, { exists = existsSync, parentOf = dirname } = {}) => {
    let current = path;
    while (!exists(current)) {
        const parent = parentOf(current);
        if (parent === current) return undefined; // 已經到 root
        current = parent;
    }
    return current;
};

/** 上層 folder 唔啱：分清楚「其實係檔案」同「未開」（QA O-2） */
const parentProblem = (label, path) => {
    const found = nearestExisting(dirname(path));
    if (found !== undefined && !isDirectory(found))
        return `[錯誤] ${label} 路徑入面嘅「${found}」係一個檔案，唔係 folder：${path}\n請檢查路徑有冇打錯（有空格要用引號包住）。`;
    return `[錯誤] ${label} 嘅 folder 唔存在：${dirname(path)}\n請先開好個 folder，或者檢查路徑有冇打錯（有空格要用引號包住）。`;
};
```

```ts
// test：Windows root 唔存在都要停
import { win32 } from 'node:path';
it('should stop at a missing Windows drive root (W-496)', () => {
    expect(
        nearestExisting('Z:\\a\\b', { exists: () => false, parentOf: win32.dirname }),
    ).toBeUndefined();
});
```

（`.d.mts` 要加對應 export 型別。）

---

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 92/100
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "claude/keen-pascal-5iifg0"
blockers: []
context: "Review of 5a61176..f19d496 (30883c5 S-567, 66a2ab0 S-570, 745ac10 S-571, 09d2df3 S-572/O-1/O-2). All 5 source items done. S-567: union of non-node_modules files across tsconfig programs identical before/after (358 = 358, diff empty); scripts-test options identical to node apart from types; mutations confirmed (probe import.meta.env in scripts/ -> tsc -b exit 2; vite/client re-added to node types -> new test red; exclude removed -> tsc -b exit 2). TS API test ~1.4s, default 5s timeout -> S-574. S-571: exit 5 justified (old exit 2 contradicted README; 0 would hide missing report); canWrite follows existing out/now/fetch io seams, acceptable. Residual: accessSync W_OK doesn't reflect Windows ACL / root, so --out late write failure still exit 4 + stack (repro --out /proc/y.json as root) -> S-573. S-572/O-1: placeholder hint '--out \"<另一個 folder>/<id>.drama.json\"' sensible. NEW W-496 (regression): nearestExisting loops forever when the Windows root doesn't exist (win32.dirname('Z:\\\\') === 'Z:\\\\'; missing drive / unreachable UNC) - previously exit 2; fix before next distribution. S-575 test-strength nits. Gates: vitest scripts src/catalog 281 pass (11 files), tsc -b 0, eslint 0, prettier warnings only in .claude/worktrees (other agent); coverage dramaFromFolder.mjs 96.65% stmts / 86.41% branches. No version bump needed (tooling only). Not pushed."
```
