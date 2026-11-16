# Code Re-review — 2026-11-16 — P9.5 #12 節目 / 劇集資料（item info）

> **改號註明（2026-11-16）**：本報告原本用 S-1015–S-1018，同 `main` S-751 review（`2026-11-16_review_S-751-remove-cli.md`）撞號，合併時改為 S-1054–S-1057：S-1015 → S-1054、S-1016 → S-1055、S-1017 → S-1056、S-1018 → S-1057。commit message 照舊用舊號。

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/catalog/item-info`（未 push），`a7607d8..919ca28`；code commit 共 19 個（`docs(mockup)` / `docs(plan)` 只用嚟對規格）
- 上一輪：`2026-11-16_review_item-info.md`（95 / 100，W-747 + S-1014、S-1054 – S-1057）
- 規格：`.proj-docs/plans/2026-11-16_plan_item-info.md`（已更新）；Design Origin：`mockup:_mockups_/catalog-item-info/index.html`（用戶真機 / preview 已確認）
- Tier **T2**；Review Item ID：今次用 **W-748**、**S-1019 – S-1021**（冇 C）
- 總評：**✅ pass（95 / 100）**。上一輪 6 項全部修好，而且每項都有回歸測試。新改動（V1–V4、「逢…播放」、橫版撳左欄閂、行資料全闊、banner、G1、64:27、ⓘ 離邊）逐點對得上 plan。得 1 個 Warning（新播放時間字眼寫死喺 selector，冇入 `zh-HK.ts`），3 個 Suggestion。

## Hard Gates

all pass —— `npx tsc -b` exit 0；`npm run lint`（eslint + `prettier --check .`）exit 0；`npx vitest related <73 個改咗嘅 src 檔> --run`：196 files / 2353 tests 全綠；新邏輯（`ItemInfo/**`、`selectors/itemInfo.ts`、`hooks/dragVelocity.ts`、`ArcSheetHeader.tsx`、`useSeriesInfo.ts`）coverage：Stmts 99.5% / Branch 98.6% / Lines 99.4%；冇新依賴。E2E 冇跑（Hard Rule #7；Developer 已報 823 PASS @ ab216d8）。Version 仍然係 1.34.0（同一個 feature branch，plan 第 9 步）。

## 上一輪 item 驗證

| ID     | Commit  | 結果        | 證據                                                                                                                                               |
| ------ | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-747  | e9578b9 | ✅ verified | `Sheet/useSheetBehaviour.ts:7-25` 用 `onCloseRef`，effect 只依 `open`；`ItemInfoSheet.test.tsx:120`「re-rendered with a new onClose」keep focus 綠 |
| S-1014 | 6db4d83 | ✅ verified | `GaugeInfoRow.tsx:20-35` 一律包 `.infoRow`；`PlayerGauge.test.tsx:434-457` 斷言 `[data-player-gauge]` 同一個 node                                  |
| S-1054 | db7772a | ✅ verified | sheet hooks 搬咗去 `components/shared/common/Sheet/`；`rg "from '.*pages/" components/shared` 冇結果；`dragVelocity` 抽去 `hooks/`                 |
| S-1055 | 4233fd8 | ✅ verified | `TodayShowList.module.css:82` 設 `--disc-small-size`，Disc（`Disc.module.css:33`）同 `.rowInfo` 共用                                               |
| S-1056 | 2909c97 | ✅ verified | `e2e/run.mjs:582,880`、`e2e/touch.mjs:466` 用 `[data-role="today-list"]`；`TodayShowListInfo.test.tsx:78` 有對應 unit test                         |
| S-1057 | 542c85a | ✅ verified | `ItemInfoSheet.tsx:87` `key={section.kind}`；`ItemInfoSheet.test.tsx:86` 同名劇集 / 短篇 test                                                      |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                     |
| -------- | ------ | ------- | ---------------------------------------- |
| 正確性   | 25     | 25      | S-1019（🟢）                             |
| 安全性   | 20     | 20      | 純顯示；banner 圖 `alt=""`、文字經 React |
| 可維護性 | 15     | 20      | W-748；S-1020 / S-1021（🟢）             |
| 測試覆蓋 | 15     | 15      | 新邏輯 99%；舊 item 全部有回歸 test      |
| 性能     | 10     | 10      |                                          |
| 代碼風格 | 10     | 10      |                                          |
| **總分** | **95** | **100** |                                          |

**結果：✅ pass**

## 🟡 W-748 — 「逢…播放」播放時間文案寫死喺 selector，冇入 `zh-HK.ts`

- 位置：`apps/player/src/selectors/itemInfo.ts:68-84`（`PLAY_TIME_PREFIX = '逢'`、`PLAY_TIME_SUFFIX = '播放'`、`` `（${start} - ${end}）` ``）
- L1：plan §「文字（`apps/player/src/i18n/zh-HK.ts`）」+「player 介面照現有慣例」；同一批改動嘅 banner 細字（`info.latestArc` / `info.arcCount`）已經入咗 `zh-HK.ts`
- L2：`rg "'[^'\n]*\p{Han}[^'\n]*'" apps/player/src -g '!*.test.*' -g '!**/i18n/**'` 淨係出 3 行：`itemInfo.ts:69`、`itemInfo.ts:70` 同開發用嘅 `playbackLog.ts:36`（複製 log 提示）—— 即係全 app 用戶睇到嘅文案只有呢度唔經 `t()`
- L3：用戶今日已經改過一次呢句字眼；文案喺 selector 入面，下次改字要改邏輯檔，而且 `zhHKCopy.test.ts` 嘅文案決定 test（例如重複字、禁用字）掃唔到呢句
- 方案 A（推薦）：`zh-HK.ts` 加 `info.playTime: '逢{days}{time}播放'`、`info.playTimeDaily: '{days}{time}播放'`、`info.playTimeRange: '（{start} - {end}）'`，`formatPlayTime` 用 `t()` 砌；selector test 唔使改
- 方案 B：只將「逢」「播放」兩個字搬入 `zh-HK.ts`（`info.playTimePrefix` / `info.playTimeSuffix`）。改動細，但前後綴拆開難睇成句，譯者唔知語序

修訂代碼（方案 A）：

```ts
/** formatAirDays 七日都播嘅字：前面唔加「逢」 */
const EVERY_DAY_TEXT = formatAirDays([0, 1, 2, 3, 4, 5, 6]);

export const formatPlayTime = (
    airDays: readonly Weekday[],
    airTime: AirTime | undefined,
): string | undefined => {
    if (airDays.length === 0) return undefined;
    const days = formatAirDays(airDays);
    // W-748：文案入 zh-HK.ts（info.playTime / playTimeDaily / playTimeRange）
    const time = airTime ? t('info.playTimeRange', airTime) : '';
    return t(days === EVERY_DAY_TEXT ? 'info.playTimeDaily' : 'info.playTime', { days, time });
};
```

## 🟢 Suggestion（backlog，唔扣分）

- S-1019 `components/shared/common/ItemInfo/InfoSection.tsx:27-30`：節目淨有 `airTime`（冇主持 / 簡介）又有 tileArt 時，banner 細字已經係播放時間、段落又 `omitAirTime`，出一個空 `<section>`（臨時 test 證實 body = `<section class="section" data-kind="show"></section>`，下面留約 28px 空白）。建議 `InfoSection` 冇欄位就 `return null`，或者喺 `ItemInfoSheet` filter 走。
- S-1020 `selectors/itemInfo.ts:26`：舊 JSDoc「資料 sheet 一段…」而家孤立喺 `ItemInfoSectionKind` 上面，兩段 JSDoc 連住；搬返落 `interface ItemInfoSection` 上面。
- S-1021 `ArcSheet.module.css:362-381` vs `ItemInfoSheet.module.css:163-182`：`[data-banner='true']` 嘅 `padding-top: 0`、grab bar 疊圖、✕ 白色 + drop-shadow 兩邊各抄一份；可以抽做 `InfoBanner.module.css` 嘅 composes / 共用 class，下次改 banner 疊層只改一處。
- Observation（冇 L2）：`useCloseOnOutsidePress.ts:6` 嘅判斷係「sheet 以外任何可撳元素」，唔限左欄；plan 寫「撳左欄任何掣」。右欄 sheet 上面仲見到嘅掣（如有）撳落都會閂。用戶已經真機確認，記低畀 QA S1 橫版留意。

## ✅ 做得好嘅地方

- 修 W-747 嗰陣順手將同一個模式（`onCloseRef` + 穩定 callback ref）用喺新 `useCloseOnOutsidePress`，播放時每秒 re-render 唔會重掛 listener / drag。
- banner 全部經 token（`--info-banner-*`、`--info-sheet-pad-x`），刻意唔跟 `--ui-scale` 嘅 inline 字號喺 `tokens.css` 寫明原因（V1 斷行）。
- `formatPlayTime` 唔改 catalog `formatAirTime`，admin 照用舊字，影響範圍收得窄。

## Handoff receipt

```handoff-receipt
protocol: 1
status: pass
score: 95/100
stage: T2
ledger: n/a
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: "99%"
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/catalog/item-info"
context: "item info re-review 95/100 pass；W-747、S-1014、S-1054–S-1057 全部 verified；新 W-748（formatPlayTime 文案寫死喺 selector，建議 merge 前搬入 zh-HK.ts）；S-1019–S-1021 backlog；integration branch = main；QA S1 chains catalog-data / drama / show-today-page"
```

## Delta re-review — `1b52b8f..f47d174`（2026-11-16）

- 範圍：f6e6db4（W-748、S-1020）、f47d174（S-1019、S-1021），只驗上面 4 項同佢哋嘅 diff
- Hard gates：all pass —— `npx vitest related <8 個改咗嘅 src 檔> --run`：104 files / 1387 tests 全綠；`npx tsc -b` exit 0；`npm run lint` exit 0
- 新 finding：冇（下一個 ID 照舊 C-024 / W-749 / S-1022）
- 分數：**100 / 100（✅ pass）**（W-748 已修，可維護性 15 → 20）

| ID     | Commit  | 結果        | 證據                                                                                                                                                                                                                     |
| ------ | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W-748  | f6e6db4 | ✅ verified | `zh-HK.ts` 加 `info.playTime` / `playTimeDaily` / `playTimeRange`；`formatPlayTime` 用 `t()`；同一條 `rg` 而家淨係出 `playbackLog.ts:36`（開發用）；`itemInfo.test.ts` 原有 formatPlayTime 斷言冇改照綠                  |
| S-1020 | f6e6db4 | ✅ verified | JSDoc 搬返 `interface ItemInfoSection` 上面                                                                                                                                                                              |
| S-1019 | f47d174 | ✅ verified | `InfoSection.tsx` `underBanner && !hasBody` → `null`；`ItemInfoSheet.test.tsx`「nothing left once the banner takes its title and time」綠（同上一輪臨時 test 同一個情況）                                                |
| S-1021 | f47d174 | ✅ verified | 疊層樣抽去 `InfoBanner.module.css` `.grabOnBanner` / `.closeOnBanner`（加 `[data-on-banner]`，specificity 0,2,0 高過兩邊 `.grab` / `.close` 嘅 0,1,0，唔靠載入次序）；屬性同搬之前一樣；兩個 sheet 都有 test 數 2 個標記 |

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
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/catalog/item-info"
context: "item info delta re-review 100/100 pass；W-748、S-1019、S-1020、S-1021 全部 verified，冇新 finding；integration branch = main；QA S1 chains catalog-data / drama / show-today-page"
```

## Merge delta — `e7dbb9f`（merge `origin/main` 48dfb14 入 branch，2026-11-16）

- 範圍：`git show e7dbb9f --remerge-diff`（code 衝突：`remoteCatalog.mjs`、`run.mjs`、`apps/player/package.json`、`package-lock.json`；`itemInfo.mjs` 跟新簽名）+ main 新改動同 item info code 嘅 semantic conflict。ledger / QA plans 歸 QA，冇驗
- Hard gates：all pass —— `npx tsc -b` exit 0；`npm run lint` exit 0；`npx vitest related packages/catalog/src/index.ts config/catalogImage.ts ItemInfo/InfoBanner.tsx selectors/itemInfo.ts i18n/zh-HK.ts catalog/dramas/index.ts --run`：227 files / 2626 tests 全綠；另跑 `catalogImageCors.node.test.ts` + `e2eSrcConstants.test.ts` 21 tests 綠；4 個 e2e `.mjs` `node --check` ok；冇殘留衝突標記
- 新 finding：冇（下一個 ID 照舊 C-024 / W-749 / S-1022）
- 分數：**100 / 100（✅ pass）**

| 檢查                          | 結果 | 證據                                                                                                                                                                                                                               |
| ----------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remoteCatalog.mjs`           | ✅   | 用 main 新簽名 `openWithCatalog(env, { contextOptions, ...routeOptions })`；`CATALOG_DIR` / `CATALOG_FOLDER` 改返 `export`（`itemInfo.mjs:8,58-59` 用到）；main 新加嘅 `ASSETS_DIR` / banner 常數保留；全部 9 個 caller 都係新簽名 |
| `itemInfo.mjs`                | ✅   | `openWithCatalog(env, { catalogBody: json, contextOptions })`，冇再傳第三個參數                                                                                                                                                    |
| `run.mjs`                     | ✅   | `runItemInfoChecks`（1690）同 `runShowGridCountChecks`（1693）兩個 section 都喺度，import 齊                                                                                                                                       |
| Version / lock                | ✅   | main 1.36.0 → 1.37.0（MINOR，feature）；`git diff 48dfb14 e7dbb9f -- package-lock.json` 淨係 `apps/player` version 一行                                                                                                            |
| 兩邊都改嘅 `catalog/index.ts` | ✅   | 自動合併：main 加 contrast / dimensions / branding export，我哋加 `type ArcInfo`，冇重疊                                                                                                                                           |
| Semantic：catalog 圖 CORS     | ✅   | main 收緊 `catalogImageCors.node.test.ts`（掃晒 components 嘅 `<img>`）；新 `InfoBanner.tsx` 有 `crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}`，test 綠                                                                                |
| Semantic：其他 main 改動      | ✅   | main 改嘅 src 集中喺 home（ShowGrid / HomeBanner）、catalog admin / document / branding / theme；冇掂 Sheet / ItemInfo / Gauge / TodayShowList / tokens / zh-HK / selectors                                                        |

```handoff-receipt
protocol: 1
status: pass
score: 100/100
stage: T2
ledger: "merge 後 28 行待 QA 重驗（ledger-merge.mjs exit 1）"
hard_gates:
  lint: pass
  type_check: pass
  tests: pass
  coverage: n/a
next_action: merge_develop
next_agent: quality-assurance
branch: "feature/catalog/item-info"
context: "merge delta e7dbb9f 100/100 pass；衝突解決正確（openWithCatalog 新簽名、CATALOG_DIR/FOLDER export、run.mjs 兩 section、1.37.0 + lock 一行），冇 semantic conflict（InfoBanner 已有 CORS crossOrigin）；ledger 28 行交 QA 重驗；integration branch = main"
```
