# Code Review — 9c Lane 4：HomeView 閒置畫面夜間低光

- 日期：2026-11-20
- 審閱者：Code Reviewer（subagent，獨立）
- 目標：PR #299 `feature/layout/ambient-night` → `release/v2.2.0`，HEAD `150efafd`（`git diff origin/release/v2.2.0...HEAD`，19 檔，+1254 / -14）
- Tier：T2（`.tsx` / `.ts` / `.css`、tokens、`SleepTimerController`、e2e section）
- 總評：plan Lane 4 範圍齊（三分一轉暗、60 秒淡入淡出、停用 / 05:00 轉返光、時間到暗到有人掂、叫醒 3 秒遮罩、減少動態即切）。9d 行為冇變（現有 SleepTimer tests 全綠）、冇 timer / listener 漏。一條 🟡：60 秒過場冇限定喺夜間切換，日間暫停 / 換節目色都變咗 60 秒

## Hard Gates

all pass。

- Lint：改咗嘅 `.ts` / `.tsx` / `.mjs` `eslint` 0；19 檔 `prettier --check` 過
- Type：`apps/player` `tsc -b` exit 0
- Tests（diff 相關）：`selectors/ambientNight`、`Ambient/`、`player/SleepTimer*`、`useSleepTimer`、`components/**` 125 files / 1292 tests 全綠（冇跑 full suite / e2e，Hard Rule #7）
- Coverage：`Ambient/**` + `ambientNight.ts` + `SleepTimerController.ts` + `useSleepTimer.ts` lines 100%、branch 96.6%
- Security：冇新依賴
- Design Origin：PR body 第一行 `mockup: _mockups_/home-view-night/index.html（第 3 輪 app 主色、第 6 輪夜間）` ✓

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                       |
| -------- | ------ | ------- | ------------------------------------------ |
| 正確性   | 20     | 25      | W-857 日間暫停 / 換色調都拖 60 秒          |
| 安全性   | 20     | 20      | 冇外部輸入；色值只喺 `HOME_THEME`          |
| 可維護性 | 20     | 20      | 純函數 + hook 分層清楚、token 齊           |
| 測試覆蓋 | 15     | 15      | 狀態表 unit + controller expiry + 5 段 e2e |
| 性能     | 10     | 10      | 見 Observation（L3，未量度）               |
| 代碼風格 | 10     | 10      |                                            |
| **總分** | **95** | **100** |                                            |

**結果：⚠️ warn**（分數 ≥ 90，但 `.claude/CLAUDE.md`「Parallel lane backlog」要求 lane 產生嘅 🟡 喺同一個 session、PR 內修完再 re-review，跟 Lane 3 做法）

## 🟡 Warning

**W-857 60 秒過場套用喺所有顏色變化，唔止夜間切換**（`Ambient/Ambient.module.css` `@media (prefers-reduced-motion: no-preference)` 嗰組 `.scope`、`.ringFill`、`.discBox > :last-child` 等）

- L1：用戶決定只畀「轉暗 / 停用 / 05:00 轉返光」60 秒；9b plan「暫停：唱片停轉變暗」+「過場用 `--view-transition-*` token」；`.claude/CLAUDE.md` Motion「時間 / easing 用 tokens.css 現有過場 token」。60 秒係夜間切換專用，其他變化唔應該跟
- L2：選擇器冇 `[data-ambient-night]` / 切換狀態限定，而 `[data-ambient-status='paused']` 改 `filter`（唱片）同 `stroke`（進度圈），`ThemeScope` 換節目改 `--theme-*` → `background-color` / `color`。Chromium（no-preference）照抄呢組規則：撳暫停 + 換色調 3 秒後，唱片 `brightness(0.975)`（目標 0.5）、進度圈 `rgb(219,158,37)`（由金 → 灰只行咗 5%）、底色 `rgb(199,64,41)`（紅 → 藍幾乎冇郁）。現有 e2e 暫停 case 係先暫停再閒置（mount 時冇過場），夜間 e2e 用 reduced motion，所以冇捉到；`e2e:visual` 只比靜止畫面
- 影響：閒置畫面出緊時用耳機 / 鎖屏掣暫停、直播到鐘換節目、「播完呢集」接集換色調，畫面要成分鐘先跟上（偏離 3 講嘅「夜間換主題都 60 秒」其實日間都中）
- 方案 A（推薦）：`useNightFade` 多回一個 `fading`，target ≠ shown 嗰刻設 `data-ambient-night-fading`（雙 rAF 之前已經喺度，過場有起點），切換後 `cssMs(--ambient-night-fade)` 先拆（effect cleanup 清 timeout）；CSS 過場選擇器改做 `.overlay[data-ambient-night-fading] …`，`.nightLevel` 可以照舊常駐。Trade-off：淡緊嗰 60 秒內暫停仍然慢，但只係 60 秒窗口；改動細
- 方案 B：`@property --ambient-night-amount { syntax: '<number>' }` 只過場呢一個數，所有夜間色 = `color-mix(日間色, 夜間色, amount)`；暫停 / 換色調即時，叫醒直接讀呢個數（唔使 `nightLevel` 元素）。Trade-off：要重寫成組色 token，`@property` 要 Safari 16.4+ / Firefox 128+
- 補測試：node CSS test 斷言過場選擇器全部帶 `[data-ambient-night-fading]`；`useAmbientNight.test` 斷言 fading 喺 60 秒後拆、unmount 清 timeout

## 🟢 Suggestion / Observation

- **S-1390**（文件，同 W-857 一齊改）`tokens.css` `--ambient-night-ease` 註解話「線性先令 `nightLevel` 暗度 = 睇到嘅暗度」：同一條 easing 下 opacity 同顏色嘅過場進度本來就一致，唔一定要 linear。60 秒用 linear 視覺上合理（用戶冇揀 easing），保留 linear，但註解改成「長過場揀線性，唔跟 `--ease-view-transition`」
- Observation：遮罩 `--ambient-veil-z` = 49，喺 toast（40）同 sheet（10）上面；3 秒內出嘅 toast / 打開嘅 sheet 會一齊由暗轉光，同「成個畫面 3 秒轉光」一致，`pointer-events: none` 唔擋操作。接受
- Observation：覆蓋層因資格改變（例如 modal、冇 track）收起唔經 `finish` → 冇遮罩，暗畫面 `--view-transition-fade` 淡走。邊緣情況，接受
- Observation（L3，未量度）：60 秒內 `.scope` / `.backdrop::after` 全屏 `background-color` 每 frame repaint，底下有 blur 底圖；QA 實機見卡先試 `.backdrop::before { will-change: transform }`
- TDD：3 個 commit test 同實現一齊加，睇唔到紅燈記錄；唔 block

## Developer 偏離判斷

| #   | 偏離                                                        | 判斷                                                                                                                                                                         |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 05:00 用時間戳（`crossedDawn(startedAt, now)`）             | 接受：背景 / 熄屏錯過 05:00 邊緣都計到；05:00 後先開嘅 timer 照轉暗（補充決定 3）；expiry 時靠 `useMinuteClock` re-render；unit 齊（剛好 05:00、前一分鐘、跨日）             |
| 2   | 叫醒過嘅時間到記喺 ambient（`acknowledgedExpiryAt`）        | 接受：controller 唔使知閒置畫面；新 timer / 取消 / 撳播先清 expiry；`expiryStopped` 擋住 pause event 未到前誤清，有 test。`SquareAmbient` remount 會重置（再閒置又暗），邊緣 |
| 3   | 夜間顏色用 CSS transition，換主題都 60 秒                   | 部分接受：夜間色唔跟節目，夜間換主題睇唔出；但日間都中 → W-857                                                                                                               |
| 4   | 隱藏 `data-ambient-night-level` 元素，叫醒讀 opacity 開遮罩 | 接受：`getComputedStyle` 讀到過場中途值；`aria-hidden`、0×0、唔可聚焦；`onWake` 喺 `setPhase('leaving')` 前叫，元素仲喺度                                                    |
| 5   | 60 秒過場用 linear token                                    | 接受（見 S-1390 註解）                                                                                                                                                       |

其他：減少動態 — CSS 過場 / 遮罩動畫都喺 `no-preference` 入面，`useNightFade` 同 `useAmbientWake` 喺切換 / 叫醒嗰刻先叫 `prefersReducedMotion()`，冇 cache ✓；遮罩唔淨靠 `animationend`，`useLeaveFallback` 3 秒後備 + `animationcancel` ✓；雙 rAF / timeout / listener 全部有 cleanup ✓；遮罩 `aria-hidden`、`pointer-events: none` ✓；`SleepTimerSnapshot` 只係加 optional key，9d tests 全綠 ✓；非方形唔 render，`e2e:visual` 234/234 一致（developer 證據）✓；Version 按 plan 喺 S3 bump ✓

## ✅ 做得好嘅地方

- `ambientNightState` 純函數 + 狀態表 test，用戶決定逐條對得上
- `expiryStopped` 處理 `pause()` 之後 audio event 未到嘅競態，諗得細
- 夜間色值只喺 `HOME_THEME` 一處，經 CSS 變數 + `color-mix` 壓暗

## 修訂代碼（W-857 方案 A，示意）

```ts
// useAmbientNight.ts — target 變咗即刻 fading（過場規則先生效），切換完 60 秒後拆
const [fading, setFading] = useState(false);
useEffect(() => {
    if (shown === target) return undefined;
    setFading(true); // W-857：只喺夜間切換期間先有 60 秒過場
    /* …原有雙 rAF… */
}, [target, shown]);
useEffect(() => {
    if (!fading || shown !== target) return undefined;
    const token = getComputedStyle(document.documentElement).getPropertyValue(
        '--ambient-night-fade',
    );
    const timer = window.setTimeout(() => setFading(false), cssMs(token));
    return () => window.clearTimeout(timer);
}, [fading, shown, target]);
```

```css
/* W-857：過場只喺夜間切換期間 */
@media (prefers-reduced-motion: no-preference) {
    .overlay[data-ambient-night-fading] .scope,
    .overlay[data-ambient-night-fading] .ringFill,
    /* …其餘同一組… */
    .nightLevel {
        transition-duration: var(--ambient-night-fade);
    }
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
branch: "feature/layout/ambient-night"
context: "PR #299 9c Lane 4 review: 1 Warning (W-857 60 s transition also applies to day pause / theme changes) + S-1390 token comment; fix in PR then re-review W-857 / S-1390 only"
blockers:
  - "W-857 Ambient.module.css 60 s transitions not scoped to night switch: day pause dims disc / ring and show-theme change take 60 s (Chromium: 3 s after pause disc brightness 0.975 vs target 0.5)"
```
