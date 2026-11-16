# Code Review — 2026-11-17 — App 圖示裁切 dialog 修正（admin 0.9.1）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/admin-player-fixes-6fzdtw` HEAD `e91f0ec`，`git diff caceff5..e91f0ec`（15 檔，+250 / −50）
- 涵蓋 commit：`1e3b4cb`（暗位裁走圖外 + 圓洞）、`a8495e5`（maskable 畫滿成張圖，刪 `safeRect` / `MASKABLE_SAFE_RATIO`）、`8a149f7`（0.9.1 + CHANGELOG）、`e91f0ec`（刪 card / dialog Android 預覽 82% 縮細）
- Tier：T1（admin UI + 輸出 PNG 幾何；冇 API / schema / 新依賴）
- Review Item ID：**S-1100 – S-1101**（冇 C / W）
- 總評：**✅ pass（100 / 100）**。冇三層收斂嘅 🔴 / 🟡；2 條 🟢

## Hard Gates

all pass

- Unit：`npx vitest related IconCanvas.tsx IconCropSource.tsx iconModel.ts iconRender.ts --run`（cwd `apps/admin`）→ 8 files / 35 tests 全綠；`src/styles/iconCrop.node.test.ts` + `iconPreviews.node.test.ts` → 13 tests 全綠
- Type：`npx tsc -b`（`apps/admin`）exit 0；Lint：改咗嘅 ts / tsx / mjs `eslint` exit 0，全部改咗嘅檔 `prettier --check` 通過
- Coverage（改咗嘅核心邏輯）：`IconCanvas` / `iconModel` / `iconRender` Stmts 96.9% / Lines 98.3%；`IconCropSource` 由新 test 覆蓋兩個 shape 分支
- Security：冇新依賴（`package-lock.json` 只改 version）
- E2E：CI run `43977993211`（head `e91f0ec`）success（Detect code changes、Lint, unit & build、E2E (Playwright) 全綠）

## 評分結果

| 維度     | 得分    | 滿分    | 備注                                      |
| -------- | ------- | ------- | ----------------------------------------- |
| 正確性   | 25      | 25      |                                           |
| 安全性   | 20      | 20      | 純前端繪圖 / CSS                          |
| 可維護性 | 20      | 20      | 刪咗冇用嘅 `safeRect` / 常數，冇留死碼    |
| 測試覆蓋 | 15      | 15      | 每個 fix 有 unit + CSS test，dim 有 e2e   |
| 性能     | 10      | 10      | 多一個 absolute span，冇額外 repaint 成本 |
| 代碼風格 | 10      | 10      |                                           |
| **總分** | **100** | **100** |                                           |

**結果：✅ pass**

## 驗證重點

- (1)+(2) 暗位：舊 `.crop-dialog .box` 嘅 `0 0 0 999px` 陰影冇任何祖先裁走（`.src` 冇 overflow），所以成個 dialog 變暗、圓框陰影出大弧 —— 根因對。新 `.dim`（`inset: 0; overflow: hidden; pointer-events: none`）同 `.src` / 原圖一樣大，`.dim-hole` 同 `.box` 用同一個 `cropBoxStyle`（百分比），`*{box-sizing:border-box}` 下洞邊 = 框外邊；`.icon-crop .box { box-shadow: none }` 同 `.crop-dialog .box` 同 specificity、排喺後面，覆蓋成立。拉柄喺 `.box` 入面、唔喺 `.dim`，貼圖邊都撳得到（e2e `checkVisibility`）。`locked` 時唔畫 `.dim`，同舊 `.box.locked { box-shadow: none }` 行為一致
- (3) maskable：`drawIcon` 一律 `drawImage(..., 0, 0, outWidth, outHeight)`，maskable 只多一個 `fillRect` 底色；iPhone / 分頁輸出不變（test `drawn[3]` 照舊）。編輯器 `.safe { inset: 10%; border-radius: 50% }` = 框中間 80% 圓，同 W3C maskable 安全區（半徑 40%）一致。`safeRect` / `MASKABLE_SAFE_RATIO` 全 repo 冇其他引用
- 預覽 82%：`.icon-prev .android img/canvas` 縮細已刪，同 `.ios` 共用 `width/height: 100%; object-fit: cover`
- 「主畫面」phone mock（`TextPreviews` → `.home img`，`apps/admin/src/styles/phase4.css`）：`56px × 56px`、`border-radius: 13px`，用 `urls.maskable` 直接畫滿，**冇**任何縮細 —— 同新嘅畫滿做法已經一致，唔使改
- Version bump 0.9.1 + CHANGELOG Fixed ✅；admin 0.9.0 未部署（`.proj-docs/deploys/` 冇 0.9.0），所以冇舊 0.9.0「縮入安全區」PNG 喺 production 要處理

## 🟢 Suggestion / Observation

- **S-1100** `_mockups_/admin-appearance/index.html` L1048 `.android img { width: 72px; height: 72px }`（88px 圓入面 = 82%）同用戶 2026-11-16 揀嘅 option (b)（畫滿）唔再一致；Design Origin 指住呢個 mockup，建議同 PR 改做畫滿（同 L1372 Q6 / L1824 cap 一齊補一句「實線圈 = 遮罩邊界」），免得下次 review 以 mockup 為準又變返縮細
- **S-1101** `IconCropSource.test.tsx` 冇覆蓋 `locked` 時唔出 `.dim`（`{!locked && …}` 分支）；加一個 `locked` render 斷言 `.dim` 唔存在即可

## ✅ 做得好嘅地方

- 根因分析準：唔係逐個狀態補 `box-shadow: none`，而係將暗位搬去一個會被裁嘅獨立層，圓 / 方共用同一套
- CSS 行為有 node test 鎖住、實際幾何有 e2e 量（暗層 rect = 原圖 rect、`overflow: hidden`、框冇陰影、拉柄見到）
- 刪 `safeRect` 時連 test、註解、`IconOutput.maskable` 文件一齊更新，冇留死碼

## Handoff receipt

```handoff-receipt
agent: code-reviewer
task: /review admin icon crop dialog fixes (admin 0.9.1)
branch: claude/admin-player-fixes-6fzdtw
commit: e91f0ec
report: .proj-docs/reviews/2026-11-17_review_icon-crop-dialog.md
score: 100
hard_gates:
  lint: pass
  type: pass
  tests: pass
  coverage: pass
  no_critical: pass
  security: pass
status: pass
next_action: proceed_to_qa
findings:
  critical: 0
  warning: 0
  suggestion: 2 (S-1100, S-1101)
context: >
  All 🟢. Per project rule (parallel lane backlog cleared same session), S-1100 (update mockup .android img to full-bleed)
  and S-1101 (locked => no .dim unit test) should be fixed in this PR or a cleanup lane. Home-screen mock (.home img) has
  no shrink and is already consistent. Report committed locally only, not pushed.
```
