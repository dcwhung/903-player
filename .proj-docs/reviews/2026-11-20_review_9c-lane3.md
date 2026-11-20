# Code Review — 9c Lane 3：閒置畫面模糊 app icon 底圖 + 左上 app 標籤

- 日期：2026-11-20
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #298 `feature/layout/ambient-backdrop-label` → `release/v2.2.0`，HEAD `c579c86f`（`git diff origin/release/v2.2.0...HEAD`，12 檔，+321 / -10）
- Tier：T2（`.tsx` / `.css`、tokens、vite define、e2e section）
- 總評：plan Lane 3 範圍齊，同 mockup 第 4 / 6 輪（`gongzi-nopillDay.webp`）對得上；短名同 manifest `short_name` 同一個 object，冇兩份來源。4 個 developer 偏離全部接受。一條 🟡：admin 准設嘅長短名會撞右上 timer / 出界

## Hard Gates

all pass。

- Lint：改咗嘅 `.ts` / `.tsx` / `.mjs` `eslint` 0；12 檔 `prettier --check` 過
- Type：`apps/player` `tsc --noEmit` exit 0；`npm run build -- --mode e2e` 過
- Tests（diff 相關）：`Ambient/`、`appShortName`、`catalogImageCors`、`brandingConfig` 43 tests 全綠（冇跑 full suite / e2e，Hard Rule #7）
- Coverage：`Ambient/**` + `appShortName.ts` lines 100%、branch 92.2%
- Security：冇新依賴
- Design Origin：PR body 第一行 `mockup: _mockups_/home-view-night/index.html（第 4、6 輪）` ✓

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                     |
| -------- | ------ | ------- | ---------------------------------------- |
| 正確性   | 20     | 25      | W-856 長短名撞 timer                     |
| 安全性   | 20     | 20      | 短名 build 時 `JSON.stringify`，React 渲 |
| 可維護性 | 20     | 20      | token 齊、d.ts 跟 `appVersion.d.ts` 慣例 |
| 測試覆蓋 | 15     | 15      | unit + e2e 都有                          |
| 性能     | 10     | 10      | 見 S-1370（Observation）                 |
| 代碼風格 | 10     | 10      |                                          |
| **總分** | **95** | **100** |                                          |

**結果：⚠️ warn**（分數 ≥ 90，但 `.claude/CLAUDE.md`「Parallel lane backlog」要求 lane 產生嘅 🟡 喺同一個 session、PR 內修完再 re-review，所以唔直接 merge）

## 🟡 Warning

**W-856 Branding 長短名會撞右上 timer / 出畫面**（`Ambient/Ambient.module.css` `.appLabel`：`white-space: nowrap`、冇 `max-width` / 截斷）

- L1：plan §底圖 / 標籤「短名 = manifest `short_name`，admin branding 有設就跟」+「同右上月亮 / 剩餘時間同一條線」；本 PR e2e 自己嘅不變式 `!overlaps(l.box, c.timer)`。Catalog schema 准 `shortName` ≤ 24 字（`BRANDING_SHORT_NAME_MAX_LENGTH`），冇設就用 `name` ≤ 40 字（`manifestText`：`text.shortName ?? text.name`）
- L2：Chromium 544×544、照抄 `.appLabel` / `.timer` 嘅 cqw 值量 bounding box：「903 Player」標籤右邊 156 / timer 左邊 433 ✓；24 個中文字 → 標籤右邊 503 > 433，**撞 timer**；40 字（冇設 shortName、name 長）→ 右邊 799，**出咗 544 畫面**。e2e build 冇 branding，只驗預設名，所以冇捉到
- 影響：admin 設長名（中文台名好常見）之後，掛牆閒置畫面左上字疊住睡眠倒數，或者被切走
- 方案 A（推薦）：`.appLabel` 加 `max-width: calc(100% - 2 * var(--ambient-timer-right) - var(--ambient-label-timer-reserve))`（新 token，按 timer 最闊「月亮 + 00:00」留位），`span` 加 `min-width: 0; overflow: hidden; text-overflow: ellipsis`。Trade-off：超長名會變「…」，但唔撞、唔出界；e2e 加一個 case 用 `evaluate` 塞 24 字短名再斷言唔撞
- 方案 B：player build 時截短（例如 `APP_SHORT_NAME` 取頭 N 字）。Trade-off：唔同字寬（英文 vs 中文）N 好難揀啱，CSS 截斷較準
- 方案 C：admin 收窄 `shortName` 上限。Trade-off：要改 catalog schema + admin，`name` fallback 照樣會長，唔推薦

## 🟢 Suggestion / Observation

- **S-1370**（Observation，唔使改）`Ambient.module.css` `.backdrop::before`：`blur(7cqw)`（544 闊 ≈ 38px）喺 124% 大嘅 layer，冇動畫、冇 `will-change`。Timer 開咗時每秒更新右上字，Chromium 非合成 filter 會重 raster 重疊嗰塊 tile 連 blur；屬 L3 推斷，未量度到掉 frame，唔 block。如 QA 喺實機見卡，先試 `.backdrop { will-change: transform }`（底圖自成合成層、blur 一次）或者換預先模糊嘅靜態圖
- **S-1371**（Observation，唔使改）tint token 只放百分比（`--ambient-backdrop-tint-mix`），顏色用 scope 內 `--color-bg`；plan 夜間要「84% 深藍黑」，Lane 4 除咗百分比仲要換顏色 token，記喺 Lane 4 handoff 即可
- TDD：單一 commit 同時加 test 同實現，睇唔到紅燈記錄；唔 block

## Developer 偏離判斷

| #   | 偏離                                                      | 判斷                                                                                                                                 |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `.timer` 加 `height: var(--ambient-top-row)`              | 接受：flex `align-items: center`，timer 原本行高 ≈ 6cqw（4cqw × line-height），位移 < 1px；兩邊中線對齊有 e2e（≤ 2px）鎖住           |
| 2   | `catalogImageCors` 豁免 `AmbientAppLabel` + guard test    | 接受：`apple-touch-icon.png` 係 publicDir（同 origin，branding icon build 時抄入），唔使 `crossOrigin`；guard 確保豁免名單唔會變死名 |
| 3   | e2e 量留白 / 焦點框時 `visibility: hidden` 底圖再還原     | 接受：pixel 量法要同平色底比；`try / finally` 還原，底圖本身另有 `checkBackdropAndLabel` 驗                                          |
| 4   | tint token 只放百分比，`--color-bg` 喺 scope 入面 resolve | 接受：`isolation: isolate` + `z-index: -1` 令 `::after` 用到節目色調；夜間顏色見 S-1371                                              |

其他：短名 vite define 同 manifest 共用 `manifestNames` ✓；`appShortName.d.ts` / `config/appShortName.ts` 跟 `appVersion` 慣例 ✓；`icon-maskable-512` / `apple-touch-icon` 都經 `BASE_URL`、branding 會覆蓋同名檔（`scripts/brandingIcons.ts`）✓；非方形 `AmbientScreen` 回 `null`，零改變 ✓；冇新動畫，減少動態 n/a ✓；尺寸全部 `--ambient-*` token、e2e `ROW_TOLERANCE_PX` 具名 ✓；Version 按 plan 喺 S3 bump ✓

## ✅ 做得好嘅地方

- 短名同 manifest 用同一個 `manifestNames`，branding 一改兩邊一齊跟
- e2e 量埋冇膠囊底、icon 真係載入、唔撞唱片 / 右格、左右邊距鏡像
- 截圖（`ambient-timer.png`）同 mockup `gongzi-nopillDay.webp` 位置、大細一致

## 修訂代碼（W-856 方案 A）

```css
.appLabel {
    /* …原有… */
    /* 長短名唔撞右上 timer、唔出界（W-856） */
    max-width: calc(100% - 2 * var(--ambient-timer-right) - var(--ambient-label-timer-reserve));
}

.appLabel span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

```handoff-receipt
protocol: 1
status: warn
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "100%"
next_action: invoke_developer
next_agent: frontend-developer
branch: "feature/layout/ambient-backdrop-label"
context: "PR #298 9c Lane 3 review: 1 Warning (W-856 long branding short name overlaps timer / overflows); fix in PR then re-review W-856 only"
blockers:
  - "W-856 .appLabel no max-width/ellipsis: 24-char CJK shortName overlaps timer (503 > 433px), 40-char name fallback overflows 544px"
```
