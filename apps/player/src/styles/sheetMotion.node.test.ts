// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { atRuleDeclarations, cssDeclarations, readCss } from '../../tests/cssRule';

/*
 * 底部 sheet（全集 ArcSheet、資料 ItemInfoSheet）彈出 / 收埋：共用 SheetMotion.module.css，
 * 按 overlay 嘅 data-sheet-state（useSheetPresence）播；減少動態冇動畫
 */
const motion = readCss(
    new URL('../components/shared/common/Sheet/SheetMotion.module.css', import.meta.url),
);
const infoSheet = readCss(
    new URL('../components/shared/common/ItemInfo/ItemInfoSheet.module.css', import.meta.url),
);
const arcSheet = readCss(
    new URL('../components/pages/drama/ArcSheet/ArcSheet.module.css', import.meta.url),
);
const MOTION = '@media (prefers-reduced-motion: no-preference)';
const TIMING = 'var(--view-transition-fade) var(--ease-view-transition)';

const keyframe = (name: string, step: string) =>
    atRuleDeclarations(motion, `@keyframes ${name}`, step);

describe('bottom sheet motion', () => {
    it('should slide the sheet up and fade the scrim in when open', () => {
        expect(atRuleDeclarations(motion, MOTION, "[data-sheet-state='open'] > .sheet")).toEqual({
            animation: `sheet-in ${TIMING}`,
        });
        expect(atRuleDeclarations(motion, MOTION, "[data-sheet-state='open'] > .backdrop")).toEqual(
            { animation: `scrim-in ${TIMING}` },
        );
        expect(keyframe('sheet-in', 'from')).toEqual({ transform: 'translateY(100%)' });
        expect(keyframe('scrim-in', 'from')).toEqual({ opacity: '0' });
    });

    it('should slide the sheet down and fade the scrim out while closing, holding the end', () => {
        expect(atRuleDeclarations(motion, MOTION, "[data-sheet-state='closing'] > .sheet")).toEqual(
            { animation: `sheet-out ${TIMING} forwards` },
        );
        expect(
            atRuleDeclarations(motion, MOTION, "[data-sheet-state='closing'] > .backdrop"),
        ).toEqual({ animation: `scrim-out ${TIMING} forwards` });
        expect(keyframe('sheet-out', 'to')).toEqual({ transform: 'translateY(100%)' });
        expect(keyframe('scrim-out', 'to')).toEqual({ opacity: '0' });
    });
});

/*
 * 橫版 docked（資料 sheet 喺右欄、全集 sheet 喺左欄）：滑上 / 滑落期間表 translateY 出咗欄底，
 * 唔可以撐大欄 / main 嘅可捲範圍（手機打橫撳 ⓘ 成頁彈上彈落）。overlay 用 clip（唔係 hidden：
 * 唔變捲動容器、唔會被程式捲），表入面清單照自己捲
 */
describe('docked sheet overflow', () => {
    it('should clip the docked info sheet overlay so the sliding sheet adds no scroll range', () => {
        expect(cssDeclarations(infoSheet, '.docked').overflow).toBe('clip');
    });

    it('should clip the docked arc sheet overlay so the sliding sheet adds no scroll range', () => {
        expect(cssDeclarations(arcSheet, '.docked').overflow).toBe('clip');
    });
});
