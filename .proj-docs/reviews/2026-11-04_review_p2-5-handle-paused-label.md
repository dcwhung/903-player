# Code Review — 2026-11-04 — P2 #5 把手「已暫停」

- 審閱者：Code Reviewer（獨立）
- 目標：`feature/home-card/handle-paused-label`（base `origin/main` @ de1ab51）
- Commits：2427081 feat · dce5303 fix 名貼碟 · c24a859 bump 1.22.1 · 888bc76 fix 狀態字塌高 + bump 1.22.2
- Tier：T2（UI feature，小範圍）
- Design Origin：`mockup: _mockups_/home-handle-paused/index.html`（方案 B）
- 總評：實作同方案 B 一致，token 用得乾淨，a11y 名稱合 WCAG 2.5.3（可見字按次序喺名入面）。唯一要修：888bc76 改咗 preview，但 preview 本身渲染唔到疊字（見 W-524）。

## Hard Gates

all pass — `tsc -b --noEmit` 0；`eslint`（src 改動檔）0；`prettier --check` 改動檔 clean；
`npx vitest run src/components/pages/home/HomePlayerCard src/pages/home/HomePageWide.test.tsx` 3 files / 33 pass。
`e2e/homeWide.mjs` lint 由 reviewer-test-scope hook 擋咗，引用 developer 結果（clean）；e2e 引用 developer 一次全跑 622/0。Coverage：n/a（CSS + 一行 JSX，行為由 HomePageWide test 覆蓋）。Security：冇新依賴。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                       |
| -------- | ------ | ------- | -------------------------- |
| 正確性   | 25     | 25      |                            |
| 安全性   | 20     | 20      |                            |
| 可維護性 | 15     | 20      | W-524 preview 同實作唔一致 |
| 測試覆蓋 | 15     | 15      |                            |
| 性能     | 10     | 10      |                            |
| 代碼風格 | 10     | 10      |                            |
| **總分** | **95** | **100** |                            |

**結果：pass**（hard gates 全 pass、95 分、冇 Critical）

## 🟡 Warning

### W-524 — preview 方案 B 渲染唔到疊字，同 shipped 設計唔一致

- 位置：`_mockups_/home-handle-paused/index.html` `.b .status`（約第 139 行）＋ status span 都帶 `class="vert status"`
- L1：Design Origin 規則 — `mockup:` 指向嘅 preview 係設計來源，layout 要同實作一致；888bc76 commit message 寫「preview updated」。
- L2：Playwright（`/opt/pw-browsers/chromium`）開 preview 量 `.b .status`：`width 16.5 / height 18.97 / scrollWidth 50 / white-space: nowrap / overflow: hidden`（三個 handle 一樣）—— 即係一行、俾 1em 闊裁到淨「已」。App 入面 `.handleStatus` 冇 `nowrap`，e2e 量到 56.9px（三行），所以產品冇事，淨係 preview 壞。
- L3：成因係 `.vert` 共用 class 帶 `white-space: nowrap; overflow: hidden`，`overflow-wrap: anywhere` 喺 nowrap 下面唔生效。
- 影響：之後有人開 preview 對設計（或者用戶再確認）會見到同產品唔同、而且似壞咗嘅樣。
- 方案 A（推薦）：`.b .status` 加 `white-space: normal;`（同 `overflow: visible`），一行改動，保留 `vert` class 其他設定。
- 方案 B：方案 B 三個 status span 拎走 `vert` class，等 `.b .status` 自己定義全部屬性；更乾淨但要改三處 markup。

## 🟢 Suggestion / Observation

- S-662 — `e2e/homeWide.mjs` 新 check 只量高度；可順手驗 `status.y + status.height <= disc.y`（喺碟上面）同 `status.width <= handle.width`，防日後次序 / 闊度回歸。
- S-663 — `width: 1em` 逐字一行只啱 CJK；而家淨 zh-HK，如果將來加非 CJK locale（"Paused"）會一個字母一行。CSS 註解已講「中文字」，加 locale 時要重新揀做法。
- Observation — `aria-hidden` 喺有 `aria-label` 嘅 button 入面其實多餘（aria-label 已蓋過內容），但無害、可防部分 browse mode 重讀，保留 OK。
- Observation — 把手出現必然係暫停：`useReopenHomePlayerCardOnPlay` 一開始播就 `openHomePlayerCard()` 收起把手，所以「已暫停」字眼唔會同實際狀態矛盾。

## 做得好嘅地方

- 888bc76 準確搵到 flex:none + vertical-rl 喺冇 vertical metrics 字型下量 0 高嘅根因，換成同字型無關嘅疊字，並有 node test 同 e2e 高度斷言做 regression guard。
- 全部數值經 token（`--font-size-2xs`、`--color-text-muted`、新 `--home-handle-status-line`），node test 仲自動驗 var 名喺 tokens.css 有宣告。
- 名稱改為「已暫停：{name}，打開播放器」：可見字（已暫停、名）按次序喺 accessible name 入面，合 Label-in-Name；測試用 `reopenLabel()` helper 統一。

## 修訂代碼（W-524）

```css
/* _mockups_/home-handle-paused/index.html */
.b .status {
    flex: none;
    width: 1em;
    line-height: 1.15;
    text-align: center;
    overflow-wrap: anywhere;
    white-space: normal; /* W-524：.vert 帶 nowrap，唔還原就疊唔到字 */
    overflow: visible;
    writing-mode: horizontal-tb;
    font-size: var(--font-size-2xs);
    font-weight: 500;
    color: var(--muted);
}
```

## Design Fidelity

- 方案 B 結構（status → disc → name → ‹）、muted 色、細一級字、flex:none、名 `text-align: start`：實作同 preview 一致。
- 唯一 deviation：preview 嘅 status 因 `.vert nowrap` 渲染成單行被裁（W-524）；實作正確。
- Component folder / 冇 inline SVG / 冇縮寫命名 / 冇 module-scope business const：OK。

## PWA

版本 1.21.15 → 1.22.2 經 `package.json`（vite `inject-app-version` 注入），lockfile 同步；SW / update / cache 冇改動。新 layout 有用戶確認嘅 preview。

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
  coverage: n/a
next_action: merge_develop
next_agent: null
branch: "feature/home-card/handle-paused-label"
context: "P2 #5 pass 95; integration branch is main (no develop). W-524 (preview .b .status needs white-space: normal) is a one-line mockup fix, recommended before merge; S-662/S-663 backlog."
```
