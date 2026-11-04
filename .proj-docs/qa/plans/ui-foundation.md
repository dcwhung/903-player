# Test Plan — ui-foundation

- Chain: 共用基礎：i18n、design tokens / global CSS、icons、ThemeScope、PageHeader、版面 / 動畫 utils、types、config 常數、test helpers
- AC:
    - AC-1 文案只經 src/i18n/t.ts + zh-HK.ts（README §架構）
    - AC-2 節目色調 / theme-color 跟 src/config/showThemes.ts（e2e 主流程寫死對照色）
    - AC-3 CSS token / breakpoint / view-transition 名由 src/styles/*.node.test.ts 鎖住
- Scope files（70 個 + 1-hop importers 0 個；確實清單 = ledger 入面呢條鏈嘅行）:
    - Core（glob）: `src/styles/*` `src/i18n/*` `src/hooks/useThemeColorMeta*` `src/types/*` `src/config/constants.ts` `src/hooks/useViewportGap*` `src/hooks/viewportGap*` `src/hooks/usePageCanvas*` `src/hooks/useMediaQuery*` `src/hooks/useElementSize*` `src/hooks/useBox*` `src/components/shared/common/ThemeScope/*` `src/components/shared/common/StatusMessage/*` `src/components/shared/common/icons/*` `src/config/layout.ts` `src/config/showThemes*` `src/utils/viewTransition*` `src/utils/transitionNames*` `src/utils/motion*` `src/utils/cssLength*` `src/utils/ratio*` `src/utils/scroll*` `src/components/shared/common/PageHeader/*` `tests/*`
- Commands:
    - npx vitest run src/components/shared/common/PageHeader/ src/components/shared/common/StatusMessage/ src/components/shared/common/ThemeScope/ src/components/shared/common/icons/ src/config/showThemes.test.ts src/hooks/useElementSize.test.tsx src/hooks/useMediaQuery.test.ts src/hooks/useThemeColorMeta.test.tsx src/hooks/useViewportGap.test.tsx src/hooks/viewportGap.test.ts src/i18n/ src/styles/ src/utils/cssLength.test.ts src/utils/motion.test.ts src/utils/ratio.test.ts src/utils/scroll.test.ts src/utils/viewTransition.test.ts （28 個 test 檔）
    - e2e: run.mjs '390×844 主流程'（Poppins / theme-color）、'Shell 高度'、'節目頁 / 今日節目頁尺寸'
    - e2e 入口只有 `npm run e2e`（build + node e2e/run.mjs，跑晒所有 section）；未有單 section runner
- PWA gate: no（唔掂 SW / manifest）
- Out of scope: 1-hop importers 刻意唔計：src 過半檔案 import 呢度（例如 t.ts 58 個），佢哋由各自嘅鏈覆蓋
