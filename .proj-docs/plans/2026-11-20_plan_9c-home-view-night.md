# 9c 開發 plan：HomeView 夜間低光 + 閒置畫面底圖 / app 標籤（同 9b 一齊出 v2.2.0）

## 進度（2026-11-20）

| 步驟    | 狀態                                                     |
| ------- | -------------------------------------------------------- |
| Preview | ✅ 第 7 版（用戶已揀晒）                                 |
| Plan    | ⏳ 待用戶 confirm                                        |
| Lane 3  | 待開始：所有閒置畫面加模糊 app icon 底圖 + 左上 app 標籤 |
| Lane 4  | 待開始：夜間低光（timer 過三分一轉暗、淡入淡出、狀態）   |
| S3      | 待開始：QA S3 重做（版本維持 2.2.0）+ 更新 PR #295       |

- Preview：https://claude.ai/artifact/S7oKy6yV53L2jnEpZeXm2M（`_mockups_/home-view-night/`，branch `docs/mockup/home-view-night`）
- 需求來源：`.proj-docs/plans/2026-11-04_plan_requirements-priority.md` 9c；9b plan `.proj-docs/plans/2026-11-20_plan_9b-home-view-ambient.md`

## Context

9b（閒置畫面）已經喺 `release/v2.2.0` 做完 S3，但 PR #295（→ `main`）未 merge。用戶 2026-11-20 決定：**9b 同 9c 一齊出，版本維持 v2.2.0**（唔另開 2.3.0）；9c 繼續喺 `release/v2.2.0` 做，完成後重做 S3、更新 PR #295 先問用戶 merge。

**硬性限制**：現有手機直／橫、平板直／橫、電腦橫版、Duo 零改變（閒置畫面只喺 HomeView 方形螢幕）；每個 PR 跑 `npm run e2e:visual`。

## 用戶決定（2026-11-19 / 2026-11-20）

| 項目               | 決定                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 範圍               | 只限 HomeView 閒置畫面                                                                                                                                         |
| 幾時轉暗           | 開咗睡眠 timer、行咗三分一時間（`fraction ≤ 2/3`）；「播完呢集」以揀嗰刻剩餘時間計                                                                             |
| 夜間顏色           | 跟 app 主色（`HOME_THEME`）壓暗：底深藍近黑、時間暗奶油、節目名 / 月亮 / 剩餘時間暗金、日子 / 副題暗灰藍；唱片灰淡                                             |
| 轉暗               | 60 秒淡入；減少動態直接切換                                                                                                                                    |
| 叫醒後再閒置       | timer 仲過咗三分一：60 秒淡入轉暗                                                                                                                              |
| 停 timer /「停用」 | 60 秒淡入轉返正常                                                                                                                                              |
| 時間到停播         | 一直暗到有人掂                                                                                                                                                 |
| 過咗 05:00         | 自動 60 秒淡入轉返正常                                                                                                                                         |
| 暗咗掂 mon 叫醒    | 返正常頁面，3 秒由暗轉光（頁面即刻用得）                                                                                                                       |
| 底圖               | **所有閒置畫面**（正常同夜間）：app icon 大幅模糊鋪滿；正常蓋 62% 節目底色，夜間蓋 84% 深藍黑                                                                  |
| 左上 app 標籤      | 所有閒置畫面：app icon + 短名（manifest `short_name`，預設「903 Player」；admin branding 有設就跟），**冇膠囊底**，同右上月亮 / 剩餘時間同一條線；夜間跟住壓暗 |
| 版本               | 同 9b 一齊出 v2.2.0；PR #295 等 9c 做完先 merge                                                                                                                |

## 技術設計

| 部分          | 做法                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 底圖          | `AmbientView` scope 加一層底圖（`icon-maskable-512.png` 經 `import.meta.env.BASE_URL`，`filter: blur` + 放大避開邊位白邊）+ 一層顏色（token `--ambient-backdrop-tint` 正常 62%、夜間 84%）；內容 `z-index` 喺上面                 |
| app 標籤      | 新 `AmbientAppLabel`：`apple-touch-icon.png` + 短名（runtime 由 manifest / branding 攞，lane 3 查現有點樣讀 app 名；冇就 `DEFAULT_APP_NAME`）；`aria-hidden`（讀屏已經有 dialog label）；位置 token 同 `--ambient-timer-top` 對齊 |
| 夜間狀態      | 純函數 `ambientNightState({ timer, fraction, expiredByTimer, nightWindow })` → `'day' \| 'night'`；`expiredByTimer` = timer 時間到暫停後一直 night，直到叫醒                                                                      |
| 時間到訊號    | `SleepTimerController` 時間到暫停時記低「timer 停咗播」（例如 snapshot 加 `expiredAt` 或者事件）；用戶叫醒 / 撳播就清；唔影響現有 9d 行為                                                                                         |
| 夜間顏色      | 新 token 組 `--ambient-night-*`（由 `HOME_THEME` 色 `color-mix` 壓暗）；`data-ambient-night` 屬性切換，CSS `transition` 用新 token `--ambient-night-fade: 60s`，減少動態 `transition: none`                                       |
| 05:00         | 重用 `useNightWindow()`：由 true 變 false → day（60 秒淡入）                                                                                                                                                                      |
| 叫醒 3 秒轉光 | 閒置畫面收起時如果係 night：喺頁面上面放一層 `pointer-events: none` 嘅暗色遮罩，3 秒淡出（token `--ambient-wake-fade: 3s`）；減少動態唔出遮罩                                                                                     |
| 唔郁現有裝置  | 全部改動喺 `Ambient/*` + 新 token；非方形冇 render                                                                                                                                                                                |

## Lane

| Lane | 內容                                                                                        | 測試                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3    | 模糊 app icon 底圖 + 左上 app 標籤（正常畫面，夜間嗰陣一樣用）                              | unit（標籤短名來源、aria-hidden）；e2e `ambient.mjs` 加：底圖存在、標籤同右上 timer 同一條線、冇膠囊底、左右留白規則照舊                               |
| 4    | 夜間狀態（純函數 + 時間到訊號）、夜間顏色 token、60 秒淡入 / 淡出、05:00、叫醒 3 秒轉光遮罩 | unit（狀態表：三分一前後、停 timer、時間到、05:00、播完呢集）；e2e：fastForward 過三分一 → `data-ambient-night`、停用 → 轉返、05:00、叫醒遮罩 3 秒消失 |

Lane 4 依賴 Lane 3（同一組檔），順序做；各自 Code Reviewer → QA S1 → CI 綠 → merge `release/v2.2.0`。之後 QA S3（版本維持 2.2.0）→ 更新 PR #295 → 問用戶 merge。開發期間定期確認 `release/v2.2.0` 冇落後 `main`。

## 待決（寫 code 前確認）

| #   | 問題                                                                             | 建議                                   |
| --- | -------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | 轉暗期間（60 秒淡入未完）有人掂：照叫醒，3 秒轉光遮罩用當刻嘅暗度開始            | 係                                     |
| 2   | 夜間時左上標籤 / 底圖照出（壓暗）                                                | 係（preview 第 6 輪已經係咁）          |
| 3   | 唔喺 21:00–05:00 但開咗 timer（例如 20:30 開）：過三分一照轉暗，05:00 規則唔適用 | 係：轉暗只睇 timer，05:00 只負責轉返光 |
