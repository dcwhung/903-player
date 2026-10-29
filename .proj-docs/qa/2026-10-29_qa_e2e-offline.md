# QA 測試報告 — 2026-10-29 — e2e 唔使網絡（`732d829`）+ 本機 Poppins（W-497 / S-576，`860d3e1`）

- 測試員：Quality Assurance（獨立角色）
- 範圍：`claude/keen-pascal-5iifg0` @ `f367617`
    - `732d829` test(e2e)：`newE2EContext` mock 字型 host，其他外部 request abort + 記錄，`run.mjs` 最尾「冇 request 出外網」check；unit test 鎖 index.html 外部 host
    - `860d3e1` test(e2e)：W-497 Poppins 400 / 500 / 600 由 devDependency `@fontsource/poppins` 本機供應，新 `checkPoppinsLoaded`；S-576 host 鎖掃晒 index.html 所有 `http(s)://`
    - Review：`reviews/2026-10-29_review_e2e-offline.md`（94）、`reviews/2026-10-29_review_e2e-offline-w497.md`（99）
- 冇改 app code（`src/` 只有 `e2eSrcConstants.test.ts`）、冇 version bump（仍係 1.20.6）；PWA 更新 gate n/a
- 環境：
    - Linux sandbox 4 core、Node 22.22.0、Playwright Chromium（`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`，冇 unset）
    - 所有 e2e 用 `E2E_PORT=4199`，逐個跑，冇其他 heavy process 同時行
    - Negative test 喺 `scratchpad/qa-neg/`（`git ls-files` 抄出嚟 + `node_modules` symlink）改，repo 冇郁過；CI 模擬喺 `scratchpad/qa-e2e-ci/` 新 clone
    - `git status` 全程乾淨（commit 只多咗本報告、index、兩張 ticket）
    - 另一個 agent 嘅 locked worktree 喺 `.claude/worktrees/agent-ae054b72982c2aa1c`（git-ignored），佢嘅 prettier warning 唔計（見 Lint gate）
- 總結：✅ **pass**（hard gate 全過、🔴 = 0）
    - 正常網絡 590 PASS（第一次 588 / 1，係已知 arcSheet 觸控 flake，**今次冇負載都出**；重跑一次 590 / 0）
    - 離線（4 個 proxy 變數指去 `127.0.0.1:9`）590 PASS，「Poppins 載入咗」同「冇 request 出外網」都 PASS；另外 probe 證實 Chromium 真係跟呢個 proxy（未 mock 嘅 URL `ERR_PROXY_CONNECTION_FAILED`，冇 proxy 就連到）
    - Guard 有牙：未 mock 嘅外部 fetch → 最尾 check `FAIL … https://qa-unmocked.example.com`，exit 1
    - Poppins check：CSS 冇 `@font-face` → 乾淨 `FAIL`；**字型檔 404 → `document.fonts.load()` reject，成個 run crash**（exit 1，唔會假 pass，但冇 FAIL 行、後面 579 個 check 冇跑）→ 🟡 **CUI-0009**
    - 新 clone `npm ci && npm test && npm run build` 全綠（1800 tests），lint / `tsc -b` / `npm audit --omit=dev` 0
    - 新 ticket：CUI-0009 🟡（Poppins check 404 crash）、CUI-0010 🟢（arcSheet flake 第二次出現，今次冇負載）。S-577 已知，唔開 ticket

---

## Hard Gates

| Gate           | 結果    | 證據                                                                                                                                                                                                                                                                            |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests          | ✅ pass | e2e 正常 **590 / 0**（重跑；第一次 588 / 1 見 §1）、離線 **590 / 0**；新 clone `npm test` **155 files / 1800 tests** 全綠；`src/e2eSrcConstants.test.ts` 9 / 9                                                                                                                  |
| Coverage       | n/a     | 改動喺 e2e harness / run.mjs（唔入 coverage 範圍）；app code 冇改                                                                                                                                                                                                               |
| Type check     | ✅ pass | `npx tsc -b` exit 0                                                                                                                                                                                                                                                             |
| Lint           | ✅ pass | 新 clone `npm run lint` exit 0（「All matched files use Prettier code style!」）。主 tree `npm run lint` exit 1 **只因** `.claude/worktrees/agent-…/design/previews/*.html` 11 個檔（另一個 agent，git-ignored）；`npx eslint .` 0、`npx prettier --check . '!.claude/**'` 乾淨 |
| Build          | ✅ pass | 新 clone `npm run build` exit 0；`dist/` 冇 `fontsource` / `poppins-latin`（唔入 production bundle）                                                                                                                                                                            |
| Security       | ✅ pass | `npm audit --omit=dev` 0 vulnerabilities；`npm audit` 6（5 low / 1 moderate）全部原有，同 review 一樣，`@fontsource/poppins@5.3.0` 冇 advisory、冇依賴、`dev: true`、lockfile 有 integrity                                                                                      |
| Data integrity | n/a     | 冇改資料 / catalog / app 邏輯                                                                                                                                                                                                                                                   |
| Performance    | n/a     | 冇 API；e2e 每次完整跑約 5–6 分鐘，同之前差唔多                                                                                                                                                                                                                                 |
| No Critical    | ✅ pass | 🔴 = 0                                                                                                                                                                                                                                                                          |
| PWA Update     | n/a     | 冇 app code / version 改動                                                                                                                                                                                                                                                      |

---

## 測試覆蓋概覽

| #   | 項目                               | 方法                                                                                      | 結果                                                   |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | 完整 e2e（正常網絡）               | `E2E_PORT=4199 npm run e2e`                                                               | 第一次 588 / 1（flake）；重跑 ✅ 590 / 0               |
| 2   | 完整 e2e（離線）                   | 同上 + `HTTPS_PROXY` / `HTTP_PROXY` / `https_proxy` / `http_proxy` = `http://127.0.0.1:9` | ✅ 590 / 0                                             |
| 2a  | 離線設定真係生效                   | Playwright probe：plain context goto `fonts.googleapis.com`                               | ✅ 有 proxy → `ERR_PROXY_CONNECTION_FAILED`；冇 → 連到 |
| 3a  | Negative：未 mock 外部 request     | scratch：主頁 `fetch('https://qa-unmocked.example.com/probe')`                            | ✅ 最尾 check FAIL，列出 origin，exit 1                |
| 3b  | Negative：字型 CSS 冇 `@font-face` | scratch：`fontsCssResponder` 答空 body                                                    | ✅ `FAIL … （冇：400 / 500 / 600）`                    |
| 3c  | Negative：字型檔 404               | scratch：`fontFilesResponder` 一律 404                                                    | ⚠️ exit 1 但係 uncaught crash，冇 FAIL 行 → CUI-0009   |
| 4   | CI 模擬                            | 新 clone `npm ci && npm test && npm run build`                                            | ✅ 全部 exit 0                                         |
| 5   | lint / tsc / audit                 | 主 tree + 新 clone                                                                        | ✅（lint 見 gate 表）                                  |

---

## 1. 完整 e2e — 正常網絡

| Run | 結果                             | 備注                                                                                                                                                                                                         |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ❌ 587 PASS / 1 FAIL（總數 588） | `FAIL  390×844 觸控全集表（清單）：全集表打開咗，喺原位（transform「(冇表)」）`。開跑時 load avg 0.56、冇其他 heavy process。`checkSnapBack` 開唔到表就 return，清單「拉 82px」兩個 check 冇跑，所以總數少 2 |
| 2   | ✅ 590 / 0                       | 冇 `RETRY`；`Poppins 400 / 500 / 600 都載入咗（全部 loaded）`、`冇 request 出外網` 都 PASS                                                                                                                   |

- 同 reviewer 見到嗰個一模一樣（同一行、同一個 `(冇表)`），但 reviewer 當時有 CPU 爭用、今次冇。即係唔淨係負載問題，係 `openSheet` 喺甩閂之後第一下 tap 有機會被吞、冇重試（推測，詳見 CUI-0010）
- 同今次改動無關：`e2e/arcSheet.mjs` 最後改係 `9ce3867`，兩個 commit 冇掂；字型只影響文字度量，全集表開唔開同字型無關
- 按指示重跑一次 → 過；開 🟢 CUI-0010 記錄（同 CUI-0003 一樣係 e2e 觸控 timing 類）

## 2. 完整 e2e — 離線

- `HTTPS_PROXY=HTTP_PROXY=https_proxy=http_proxy=http://127.0.0.1:9 E2E_PORT=4199 npm run e2e` → **590 PASS / 0 FAIL**，exit 0
- `curl -x http://127.0.0.1:9` → `Failed to connect … port 9`（proxy 真係死）
- Probe（`chromium.launch()`，同 run.mjs 一樣唔傳 proxy option，plain context 冇 harness route）：
    - 有 proxy 變數：`net::ERR_PROXY_CONNECTION_FAILED at https://fonts.googleapis.com/css2?family=Poppins`
    - 冇 proxy 變數：連到
    - → 離線 run 嘅 590 係真離線，唔係 proxy 被忽略

## 3. Negative tests（scratch copy，repo 冇改）

### 3a. 未 mock 嘅外部 request → guard FAIL ✅

主頁 `waitForSelector('nav[aria-busy="false"]')` 之後加一句 `page.evaluate(() => fetch('https://qa-unmocked.example.com/probe').catch(() => {}))`：

```text
FAIL  冇 request 出外網（mock 咗嘅 host 除外）：https://qa-unmocked.example.com
1 E2E check(s) failed
```

589 PASS / 1 FAIL，exit 1。其餘 check（包括 Poppins）照過，即係 guard 只捉到加嗰個 request，冇誤報。

### 3b. 字型 CSS 冇 `@font-face` → Poppins check FAIL ✅

`fontsCssResponder` body 改做 `''`（即係 W-497 之前嘅行為）：

```text
FAIL  390×844 主頁：Poppins 400 / 500 / 600 都載入咗（冇：400 / 500 / 600）
```

### 3c. 字型檔 404 → run crash ⚠️（CUI-0009）

`fontFilesResponder` 一律答 404：

```text
PASS  390×844 主頁：版本號 v1.20.6 喺橫額右下角（321, 89）
page.evaluate: NetworkError: A network error occurred.
    at checkPoppinsLoaded (…/e2e/run.mjs:112:28)
```

- exit 1、`finally` 閂咗 browser 同 preview（port 4199 冇殘留、冇 chromium / vite 進程）→ **gate 冇漏**
- 但 CSS Font Loading API 嘅 `document.fonts.load()` 遇到載入失敗係 **reject**，唔係回傳 `status: 'error'` 嘅 face；`checkPoppinsLoaded` 冇 catch。結果：冇 Poppins `FAIL` 行、冇失敗總結、後面 579 個 check 冇跑。`run.mjs` 註解（「字型檔 404 就係……唔係 loaded」）同 reviewer 描述（「字型檔 404 會係 error，兩樣都會 FAIL」）都唔準
- 一個字重檔唔見（例如 fontsource 升級改名、S-577 情況）都係同一條路
- 🟡 Medium：唔影響 merge（唔會假 pass），但新 check 喺佢最主要守住嘅失敗模式下診斷差

## 4. CI 模擬 + 靜態檢查

新 clone `scratchpad/qa-e2e-ci/`（`git clone --no-hardlinks` 本機 repo @ `f367617`）：

| 步驟            | 結果                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm ci`        | exit 0；lockfile 同 `package.json` 一致；`@fontsource/poppins/files/poppins-latin-{400,500,600}-normal.woff2` 齊 |
| `npm test`      | exit 0，155 files / 1800 tests                                                                                   |
| `npm run build` | exit 0；`dist/` 冇 fontsource 字型                                                                               |
| `npm run lint`  | exit 0                                                                                                           |

主 tree：`npx tsc -b` 0、`npm audit --omit=dev` 0、`npm ls @fontsource/poppins` → 5.3.0。

---

## 主動測試（edge case）

QA 唔可以 commit 測試；以下 4 個 edge case 用 scratch 改動實跑，結果見 §2–3：

1. 真離線（dead proxy）下成套 e2e — 證實冇隱藏網絡依賴
2. 未 mock 外部 host — guard 捉到兼只捉到佢
3. 字型 CSS 空 — Poppins check 正確 FAIL
4. 字型檔 404 — 揾到 CUI-0009

建議補測（交 developer，跟 CUI-0009）：

- `checkPoppinsLoaded` 改完之後，用 3c 嘅改法驗證出 `FAIL` 行而唔係 crash
- S-577 建議嘅 unit test：index.html css2 網址嘅 Poppins 字重每個都有對應 `@fontsource/poppins/<w>.css` 同 latin woff2

---

## 問題修正優先順序

| 優先 | Ticket   | 問題                                                                        | 負責               | 阻 merge？ |
| ---- | -------- | --------------------------------------------------------------------------- | ------------------ | ---------- |
| 1    | CUI-0009 | 🟡 `checkPoppinsLoaded` 字型檔 404 時 uncaught reject，run crash 冇 FAIL 行 | Frontend Developer | 否         |
| 2    | CUI-0010 | 🟢 arcSheet 觸控「清單：全集表打開咗」甩閂後偶然 `(冇表)`，冇負載都出       | Frontend Developer | 否         |
| —    | S-577    | css2 字重解析唔識新語法（review 已知，非阻塞，唔開 ticket）                 | —                  | 否         |

## 測試建議（下一步）

- CUI-0009 同 S-577 一齊修（同一個 responder / check），改動細
- CUI-0010：先喺失敗時截圖確認原因，再決定 `openSheet` 重試定等手勢完結；唔好加固定 sleep
- e2e gate 而家一日內兩次見同一個 flake，修好之前 e2e FAIL 只係呢一行嘅話照 CUI-0003 做法重跑一次

---

## Handoff receipt

```handoff-receipt
protocol: 2
status: pass
score: n/a
hard_gates:
  lint: "pass (clean clone npm run lint 0; main tree fails only on another agent's git-ignored .claude/worktrees previews)"
  type_check: pass
  tests: "pass (e2e normal 590/0 on rerun after 1 known arcSheet flake; e2e offline 590/0; vitest 1800/1800 in fresh clone)"
  build: pass
  coverage: "n/a (e2e harness only)"
  security: "pass (npm audit --omit=dev 0)"
  data_integrity: n/a
  performance: n/a
  no_critical: pass
  pwa_update: "n/a (no app code / version change)"
next_action: merge_main
next_agent: devops-engineer
branch: "claude/keen-pascal-5iifg0"
context: "e2e offline + local Poppins verified: 590/0 normal (rerun) and offline (dead proxy confirmed honoured by Chromium); guard fails on unmocked fetch; Poppins check fails on empty CSS but crashes run on font 404 (CUI-0009 Medium, non-blocking); arcSheet flake recurred without load (CUI-0010 Low); npm ci/test/build/lint/tsc/audit clean."
```
