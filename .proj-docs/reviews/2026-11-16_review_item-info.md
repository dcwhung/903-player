# Code Review — 2026-11-16 — P9.5 #12 節目 / 劇集資料（item info）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`feature/catalog/item-info`（未 push），`c399d7b..505f5e2`（7 個 code commit；之前 `docs(mockup)` / `docs(plan)` 只用嚟對規格）
- 流程：標準 `/feature`；Tier **T2**（MINOR 1.33.0 → 1.34.0、跨 catalog / drama / show-today-page）
- 規格：`.proj-docs/plans/2026-11-16_plan_item-info.md`；Design Origin：`mockup:_mockups_/catalog-item-info/index.html`（頁頂兩節：「今日節目頁」+「A 修訂版」）
- Review Item ID：今次用 **W-747**、**S-1014 – S-1018**（冇 C）
- 總評：**✅ pass（95 / 100）**。規格逐點對得上：registry 冇值唔出 key、只帶 enabled arc；`hasItemInfo` 唔計 airDays；ⓘ 分流（未揀 → 全集展開、已揀 → 獨立 sheet）；揀未聽短篇自動彈；今日節目表箭咀 + localStorage（有 try/catch）；lamp 80%；動畫放 `prefers-reduced-motion: no-preference`、用 `--view-transition-fade` + `grid-template-rows 0fr → 1fr`。測試有咬力（新邏輯 coverage 99%）。只有 1 個 Warning（焦點每次 re-render 被搶走），同 5 個 Suggestion。

## Hard Gates

all pass —— `npx tsc -b` exit 0；`npm run lint`（eslint + `prettier --check .`）exit 0；`npx vitest related <39 個改咗嘅 src 檔> --run`：192 files / 2290 tests 全綠；新邏輯（`selectors/itemInfo.ts`、`useSeriesInfo`、`useTodayInfo`、`useShowInfo`、`useDailyInfo`、`useItemInfoSheet`、`ItemInfo/*.tsx`）coverage：Stmts 99.3% / Branch 97.7% / Lines 99.2%；冇新依賴（lock 只改 version 兩行）。E2E 冇跑（Hard Rule #7，屬 QA / CI）。

Version bump：`apps/player/package.json` + `package-lock.json` 1.33.0 → 1.34.0 ✅（plan 第 9 步）。

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                  |
| -------- | ------ | ------- | ----------------------------------------------------- |
| 正確性   | 20     | 25      | W-747                                                 |
| 安全性   | 20     | 20      | 純顯示；chip 唔係連結；文字經 React escape            |
| 可維護性 | 20     | 20      | S-1014 / S-1015 / S-1016 / S-1018（🟢 唔扣分）        |
| 測試覆蓋 | 15     | 15      | 新邏輯 99%；e2e 新 section 覆蓋直版 / 橫版 / 減少動態 |
| 性能     | 10     | 10      |                                                       |
| 代碼風格 | 10     | 10      | S-1017（🟢）                                          |
| **總分** | **95** | **100** |                                                       |

**結果：✅ pass**

## 🟡 W-747 — 資料 sheet 開住時，每次 re-render 焦點都會由 sheet 入面被搶返去 sheet 本身

- 位置：`apps/player/src/hooks/useItemInfoSheet.ts:17`（`close: () => setOpen(false)` 每次 render 新 function）→ `apps/player/src/components/shared/common/ItemInfo/ItemInfoSheet.tsx:33` → `components/pages/drama/ArcSheet/useSheetBehaviour.ts:5-19`（`useSheetFocus` effect deps 有 `onClose`）；`pages/drama/useSeriesInfo.ts:84`（`infoSheet.close` 同樣）
- L1：`useSheetBehaviour.ts:4` 自己嘅契約「打開時焦點入表；收埋之後焦點返去打開前嗰粒掣」；plan §2「✕、Escape」閂 sheet；agent 檢查清單 Accessibility「鍵盤導航」
- L2：臨時 test（已刪）：render `ItemInfoSheet`、focus「關閉」掣、用新 `onClose` lambda `rerender` → `expect(document.activeElement).toBe(close)` **fail**，焦點落咗 `<section role="dialog">`
- L3：`useSheetFocus` effect 依 `onClose`；onClose 每 render 變 → cleanup `opener.focus()` 再重新 `sheet.focus()`。`playerContext` 有 `currentTime`，`useShowPage` / `useDailyDramaPage` / `useSeriesDramaPage` 用 `usePlayer()`，播放時每秒 re-render ⇒ 鍵盤 / 讀屏用戶 Tab 去「✕」一秒內就被扯走，讀屏焦點每秒跳。拉閂（`useCloseTimer`）已經用 ref 避開呢個問題，焦點 hook 冇（全集 `ArcSheet` 本身都中，舊問題，今次新 sheet 擴大影響）
- 方案 A（推薦）：`useSheetFocus` 用 `onCloseRef`（同 `useSheetDragControls.ts:68-73` `useCloseTimer` 一樣），effect 只依 `open`。一處改，兩張 sheet 都修好；加一個「rerender 新 onClose 焦點唔郁」unit test
- 方案 B：`useItemInfoSheet` / `useArcInfoSheet` / `useArcSheetActions` 嘅 `close` 包 `useCallback`。缺：要改三處，將來新 caller 又會中

修訂代碼（方案 A，`useSheetBehaviour.ts`）：

```ts
const useSheetFocus = (open: boolean, onClose: () => void) => {
    const sheetRef = useRef<HTMLElement>(null);
    // W-747：onClose 用 ref，播放時每秒 re-render 唔會重跑 effect 搶走焦點
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement as HTMLElement | null;
        sheetRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [open]);
    return sheetRef;
};
```

## 🟢 Suggestion（backlog，唔扣分）

- S-1014 `components/shared/player/PlayerPanel/GaugeInfoRow.tsx:20`：有冇 `onInfo` 決定包唔包 `.infoRow`，⇒ ⓘ 出現 / 消失時成個 gauge（Disc、ArcSlider）remount（臨時 test 證實 `[data-player-gauge]` 換咗 node）；短篇劇喺有 / 冇資料嘅短篇之間轉會觸發。建議一律包 wrapper，淨係條件 render 粒掣。
- S-1015 `components/shared/common/ItemInfo/ItemInfoSheet.tsx:3`：shared 第一次 import `components/pages/drama/ArcSheet/useSheetBehaviour`（依賴方向反咗，同 S-660 同類）。建議將 `useSheetBehaviour` / `useSheetDrag*` 搬去 `components/shared/common/Sheet/`（或 `hooks/`）。
- S-1016 `components/pages/today/TodayShowList/TodayShowList.module.css:83`：`--today-row-disc: calc(40px * var(--ui-scale))` 抄 `Disc.module.css:33` 嘅預設；Disc 改大細資料區就對唔齊。建議喺 `.row` 設 `--disc-small-size` 俾 Disc 同 `.rowInfo` 共用。
- S-1017 `e2e/run.mjs:581`、`e2e/touch.mjs:465`：`region 節目表 → getByRole('list')`，有主持資料而且展開時（chip 係 `<ul>`）會 strict-mode 撞。建議改 `.locator(':scope > ul')` 或者加 `data-role` 揀主清單。
- S-1018 `components/shared/common/ItemInfo/ItemInfoSheet.tsx:65`：`key={section.title}`，短篇顯示名同劇集名一樣時 key 撞。建議用 index 或者段落類型做 key。

## Developer 疑點評估

| #                                       | 結論                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1 橫版 sheet 冇遮罩                     | 符合 plan §2「橫版喺右欄，唔蓋左欄」+ 全集 docked 做法；plan 只寫直版有遮罩 → 唔係 finding，**要用戶確認**（產品）             |
| 2 冇 airTime 唔出播放時間               | plan 兩句（`formatAirTime(airDays, airTime)` vs「airDays 本身唔計」）有歧義 → **要用戶決定**淨有 airDays 時出唔出「星期六」    |
| 3 冇加展開 / 收合 i18n                  | 固定名 + `aria-expanded` 係正確 ARIA 做法，plan §3 本身就咁寫；只係 plan「文字」清單多咗兩項 → 唔係 finding，建議 PM 更新 plan |
| 4 自動彈唔計播放掣                      | plan §5 寫明「chip / 全集行」→ 符合；如要計播放掣係**產品決定**                                                                |
| 5 今日「第一次」要有資料先記            | 合理（冇資料冇箭咀，記咗會浪費第一次）→ 唔係 finding                                                                           |
| 6 橫版標題列一律顯示                    | plan §4 / mockup「橫版加返標題列」→ 符合；冇資料時出唔出係**產品決定**（小）                                                   |
| 7 資料放 li、分隔線 / 淺底 / lamp 搬 li | 讀屏讀到資料，li 同 button 淺底同色冇重疊問題 → 唔係 finding                                                                   |
| 8 shared import pages hook              | → S-1015                                                                                                                       |
| 9 e2e 用 remote catalog route           | 唔改 library json 係啱嘅做法 → 唔係 finding                                                                                    |
| 10 `getByRole('list')` 將來撞           | → S-1017                                                                                                                       |

## ✅ 做得好嘅地方

- 資料組合全部係純函數（`selectors/itemInfo.ts`），「冇值唔出 key」同 catalog `present` 一致，缺項唔出「未有資料」。
- 收埋用 `inert` + `aria-hidden`，Tab / 讀屏唔會入去；減少動態直接切換，唔等 `transitionend`。
- e2e 示範資料重用 remote catalog route，覆蓋直版 / 橫版 / 減少動態 / 第一次 vs 再入。

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
context: "item info 95/100 pass；W-747（sheet 焦點每次 re-render 被搶，修 useSheetFocus 用 onCloseRef）建議 merge 前修；S-1014–S-1018 backlog；疑點 1/2/4/6 要用戶決定；integration branch = main；QA S1 chains catalog-data / drama / show-today-page"
```
