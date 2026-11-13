# Code Review — App 外觀 branding（admin 0.2.0 / api 0.9.0 / player 1.36.0）

- 日期：2026-11-13
- 審閱者：Code Reviewer（獨立）
- 目標：`feature/admin-branding` @ `0fa3e86`，`git diff $(git merge-base HEAD origin/main)..HEAD`（12 commit、148 檔）
- SSoT：`.proj-docs/plans/2026-11-13_plan_branding.md`；Design Origin：`mockup: _mockups_/admin-appearance/index.html`
- Tier：T2（新功能，跨 catalog / api / admin / player / CI）
- 總評：安全面做得穩陣：GitHub token / Vercel hook 只入 header / URL，log 只寫 target 名同 HTTP status；外部 call 全部 `AbortSignal.timeout(10 s)`；`triggerDeploy` 永遠唔 throw，`setPublishDeploy` 失敗只 log，publish 唔會因部署失敗而失敗。PNG 驗 signature + IHDR + 尺寸白名單，R2 只 range get 頭部。`/api/branding/favicon` redirect 目標只會係 publish 時經 `resolveImages` 砌嘅 `WORKER_ORIGIN` 圖 URL（唯一寫 `publishes` 嘅路徑），冇 open redirect。Player build 任何一步失敗都 fallback 內建值，icon 全部下載 + 驗 hash 先寫副本。有兩個收斂嘅 🟡：build 時換 HTML 用咗 string replacement（`$` pattern 會破壞 index.html），同埋重新部署之後部署狀態唔會再 poll。

## Hard Gates

all pass。

- lint：`npm run lint`（eslint + `prettier --check .`）exit 0
- type：`npx tsc -b`（apps/player、apps/admin、apps/api、packages/catalog）全部 exit 0
- unit（diff 相關）：`npx vitest related --run <改動嘅 .ts/.tsx>` → 403 files / 4321 tests pass（改咗 `packages/catalog` index，所以 related 範圍闊；冇跑 e2e）
- coverage：`scripts/brandingConfig.ts` 97% / `brandingIcons.ts` 100%（line）；api `branding.test.ts`、`deploy.test.ts`、`png.test.ts` 覆蓋新 route
- security：冇新依賴；version 已 bump（player 1.36.0、admin 0.2.0、api 0.9.0）

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                   |
| -------- | ------ | ------- | ---------------------------------------------------------------------- |
| 正確性   | 15     | 25      | W-736 HTML replacement、W-737 重新部署後狀態唔更新                     |
| 安全性   | 20     | 20      | secret 唔入 log / response；timeout；PNG 驗證；favicon 同源            |
| 可維護性 | 20     | 20      | 模組拆得細；S-965 / S-966 / S-968 唔扣分                               |
| 測試覆蓋 | 15     | 15      | api / catalog / player script / admin component 都有 test              |
| 性能     | 10     | 10      | favicon 用 `json_extract` 喺 D1 拆；icon 頭部 range get                |
| 代碼風格 | 10     | 10      | lint / prettier 全過；書面語 test 鎖住 zh-HK.ts                        |
| **總分** | **90** | **100** | **結果：⚠️ warn（有兩個收斂 🟡，要喺同一條 branch 修完再 re-review）** |

## 🟡 Warning

### W-736 build 時換 title / meta 用 string replacement，App 名 / 簡介有 `$'`、`$&` 會破壞 index.html

- 位置：`apps/player/scripts/brandingConfig.ts:84`（`tag.replace(/content=.../, \`content="${…}"\`)`）、`:90`（`<title>` replace）
- L1：plan「`index.html` `<title>`、meta description、og:\* 用 catalog 值」；`parseCatalogText` 冇禁 `$`，admin 可以輸入
- L2：`applyBrandingText(html, { name: "A$'B", description: 'D$&E' })` 輸出 `<title>A<meta …>…</body>B</title>`，`$'` 將成段 HTML 剩餘部分（包括 module script）再插入一次；`$&` 變成原本 match 嘅字（scratchpad tsx 重現）
- L3：production index.html 會壞 / 重複載入 script，要改名再部署先救到
- 方案 A（推薦）：兩處都改用 function replacement：`.replace(pattern, () => \`content="${escapeHtml(value)}"\`)`，加 unit test（name 含 `$'`、`$&`、`$1`）
- 方案 B：`escapeHtml` 順手將 `$` 轉做 `&#36;`。可以修到，但令 escape 同 replace 語意混埋，唔推薦

### W-737 重新部署之後，原本已 triggered 嗰行唔會再 poll，一直顯示舊結果

- 位置：`apps/admin/src/features/history/useDeployStatus.ts:9-28`（effect deps 得 `[id, enabled]`；`tries` ref 永遠唔 reset）
- L1：plan「發佈 / 部署頁每行部署狀態 + 重新部署（mockup ④）」：重新部署之後要見到新一次 run 嘅狀態
- L2：臨時 test：row `deploy: 'triggered'` → poll 返 `failure` → 模擬 redeploy 後 rerender（同 id、仍然 triggered、新 `deployRequestedAt`）→ API 只被 call 1 次，畫面仍然「部署失敗」（`expected { calls: 1, stillFailed: true } to deeply equal { calls: 2, stillFailed: false }`）。`unknown` → 重新部署一樣中
- 方案 A（推薦）：hook 收 `deployRequestedAt` 入 deps，effect 開頭 `tries = 0`（改用 effect 內 local counter，唔使 ref）、`setStatus(undefined)`；`DeployCell` 傳 `row.deployRequestedAt`；加 test：redeploy 後再 poll、到 `DEPLOY_POLL_MAX` 停、unmount 停
- 方案 B：`HistoryRow` 用 `key={\`${row.id}-${row.deployRequestedAt}\`}`重新 mount`DeployCell`。改動細，但靠 key 副作用，唔夠直接

## 🟢 Suggestion（同一條 branch 修，每項一個 commit）

- S-965 `apps/player/vite.config.ts:79-98`：檔案 149 → 171 行（> 150）。將 `loadBranding` + `brandedPublicDir` 抽去 `scripts/brandingBuild.ts` 嘅 `resolveBuildBranding({ command, mode, catalogUrl })`，回 `{ text, publicDir }`，vite.config 只 spread 結果
- S-966 `.proj-docs/plans/2026-11-13_plan_branding.md:75`：「還原到有 branding 改動嘅版本都會觸發部署」同實作唔符（rollback 照用而家 D1 branding，唔會還原舊 branding；只係 D1 草稿同上次發佈唔同先觸發）。改寫成同 `apps/api/README.md:141` 一致，並喺 `apps/api/test/deploy.test.ts` 加一個 rollback 會 / 唔會觸發部署嘅 test
- S-967 `apps/admin/src/features/history/useDeployStatus.ts:20`：poll 到 `DEPLOY_POLL_MAX`（5 分鐘）仲係 queued / in_progress 就停，畫面永遠「部署中」又冇重新部署 / 重新整理入口。到上限時 `setStatus({ status: 'unknown', url: 最後 url })`，等 `deployView` 顯示「狀態不明」+ 重新部署；加 test
- S-968 `.proj-docs/plans/2026-11-13_plan_branding.md:50`：plan 寫 icon 喺 `scripts/catalogSnapshot.ts` 下載，實作係 `scripts/brandingIcons.ts` + `vite.config` 改 `publicDir`（config 階段要定 publicDir）。喺「實作差異」加一行講明

Observation（唔使修）：vite config 階段同 `catalogSnapshot` buildStart 各 fetch 一次 catalog.json，publish 剛好喺兩次之間會令 branding 同 snapshot 屬不同版本，下次 build 自然一致。

## ✅ 做得好嘅地方

- `deploy-api.yml` secret 經 env → 600 權限暫存 JSON → `wrangler secret bulk`，唔經 command line，trap 刪檔
- `deployStatus` 用「觸發前記時間 + 最早一個 run」，同 push 觸發嘅 run 用 `event=repository_dispatch` 分開
- `brandingIcons.ts` 先全部下載 + 驗 PNG magic + sha256 檔名先寫，失敗清走副本，唔會留半套 icon

## 修訂代碼（W-736 / W-737）

```ts
// apps/player/scripts/brandingConfig.ts — W-736：function replacement，唔解讀 $ pattern
const setMetaContent = (html: string, marker: string, value: string): string =>
    html.replace(/<meta\b[^>]*>/g, (tag) =>
        tag.includes(marker)
            ? tag.replace(/content="[^"]*"/, () => `content="${escapeHtml(value)}"`)
            : tag,
    );
// applyBrandingText：html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(text.name)}</title>`)

// apps/admin/src/features/history/useDeployStatus.ts — W-737：每次觸發（requestedAt）重新 poll
export const useDeployStatus = (id: number, enabled: boolean, requestedAt: string | null) => {
    const [status, setStatus] = useState<DeployStatus>();
    useEffect(() => {
        if (!enabled) return undefined;
        let live = true;
        let tries = 0; // 每次觸發重新計
        let timer: ReturnType<typeof setTimeout>;
        setStatus(undefined);
        const poll = async () => {
            tries += 1;
            const next = await getDeployStatus(id).catch(() => undefined);
            if (!live) return;
            if (next) setStatus(next);
            const done = next && next.status !== 'queued' && next.status !== 'in_progress';
            if (!done && tries < DEPLOY_POLL_MAX)
                timer = setTimeout(() => void poll(), DEPLOY_POLL_MS);
        };
        void poll();
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [id, enabled, requestedAt]);
    return status;
};
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: warn
score: 90/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "97%"
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/admin-branding"
context: "Fix W-736 (player build HTML replacement) and W-737 (admin deploy status re-poll), then S-965..S-968, one commit each, then re-review"
blockers:
  - "W-736 apps/player/scripts/brandingConfig.ts:84,90 string replacement interprets $ patterns"
  - "W-737 apps/admin/src/features/history/useDeployStatus.ts:9-28 no re-poll after redeploy"
```

---

## Re-review（2026-11-13，`0fa3e86..744b974`）

- 範圍：上一輪 🟡 / 🟢 嘅修正（`d75d5b5` W-736、`1122dd9` W-737、`09ef640` S-967、`329c7bc` S-965、`1c27333` S-966、`137ba9e` S-968）+ 用戶追加 `32a21f3`（App 圖示 dialog 預覽排版）、`744b974`（統計行只喺節目 / 劇有改先顯示）
- Hard gates：all pass
    - lint：`npm run lint` exit 0
    - type：`npx tsc -b`（apps/player、apps/admin、apps/api、packages/catalog）全部 exit 0
    - unit（diff 相關）：`npx vitest related --run <改動嘅 .ts/.tsx>` → 408 files / 4352 tests pass；api `test/deploy.test.ts` 21 pass；冇跑 e2e（admin `iconPreviewFitCheck` 留 QA / CI）
    - coverage：`brandingBuild.ts`、`e2eCatalogNotFound.ts`、`useDeployStatus.ts`、`contentChangedOf` 每個分支都有 test
    - 另外用 `resolveConfig(build, e2e)` 載入 `apps/player/vite.config.ts`：`publicDir` = `apps/player/public`、`e2e-catalog-not-found` plugin 照裝（Vite 8 會替換 `import.meta.dirname`，抽出去 `scripts/` 冇改路徑）

### 逐項確認

| ID      | 結果 | 確認                                                                                                                                                                                                                                                                      |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-736   | 已修 | `<title>` 同 `setMetaContent` 兩處都改 function replacement；test 用 `$'` / `$&` / `$1` / `` $` `` / `$$`，`</html>` 只得一個                                                                                                                                             |
| W-737   | 已修 | 冇用 effect 內 `setStatus(undefined)`，改為結果連 `id@requestedAt` key 存、key 唔對就回 `undefined`：效果同建議一樣（舊結果即刻消失、次數由 0 再計），又避開 `react-hooks/set-state-in-effect`；`DeployCell` 傳 `deployRequestedAt`；hook test 有 redeploy、上限、unmount |
| S-965   | 已修 | `vite.config.ts` 171 → 135 行；`resolveBuildBranding` 行為不變（冇 icon / 下載失敗都回內建 `publicDir`）；`e2eCatalogNotFound` 一併抽出，e2e 註解路徑已更新                                                                                                               |
| S-966   | 已修 | plan 改寫成同 `apps/api/README.md` 一致；`deploy.test.ts` 加 rollback 會 / 唔會觸發兩個 case                                                                                                                                                                              |
| S-967   | 已修 | 到 `DEPLOY_POLL_MAX` 仲係 running（或全部 poll 失敗）→ `{ status: 'unknown', url: 最後 url }`，`deployView` 顯示狀態不明 + 重新部署                                                                                                                                       |
| S-968   | 已修 | plan「實作差異」寫明 `brandingIcons.ts` + `brandingBuild.ts` 改 `publicDir`，連 Observation（兩次 fetch）都記低                                                                                                                                                           |
| 32a21f3 | OK   | `minmax(0, 1fr)` + `min-width: 0` + 標籤 `nowrap` / 分頁標題 ellipsis + `title` tooltip；冇 hardcoded 色；CSS node test + admin e2e 1280 / 1100 量幾何                                                                                                                    |
| 744b974 | OK   | `contentChangedOf`：冇 change summary（舊記錄）照顯示、`items` 空（淨 Banner / 外觀 / 冇內容變更）唔顯示，符合用戶確認；`timeline` 由 `items` 推導，唔使另外睇；失敗行照顯示錯誤；`BannerLine` / `BrandingLine` 合併做 `ExtraLine`                                        |

### 新 finding

冇。

### 評分

| 維度     | 得分    | 滿分    | 備注                                      |
| -------- | ------- | ------- | ----------------------------------------- |
| 正確性   | 25      | 25      | W-736 / W-737 已修，有 test 鎖住          |
| 安全性   | 20      | 20      | 無變                                      |
| 可維護性 | 20      | 20      | vite.config ≤ 150 行；ExtraLine / RowMeta |
| 測試覆蓋 | 15      | 15      | hook、build、rollback、CSS、e2e 都有      |
| 性能     | 10      | 10      | 無變                                      |
| 代碼風格 | 10      | 10      | lint / prettier 全過                      |
| **總分** | **100** | **100** | **結果：✅ pass**                         |

### Handoff receipt（re-review）

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: pass
next_action: invoke_qa
next_agent: quality-assurance
branch: "feature/admin-branding"
context: "Re-review of 0fa3e86..744b974: W-736, W-737, S-965..S-968 fixed; user follow-ups 32a21f3 / 744b974 OK; no new findings. Admin e2e iconPreviewFitCheck not run by reviewer (QA / CI)."
blockers: []
```
