// @vitest-environment node
// 新主頁（P10 lane 3）分類掣嘅過場名（W-791）：只有有播放卡（split）先多咗左欄頂橫額，分類掣先係第二格；
// 冇卡用返原本填滿格，分類掣照舊係第一格，唔可以將過場名落咗去格仔度
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const css = readCss(new URL('./HomePage.module.css', import.meta.url));
const SPLIT = "main.wide[data-shelf][data-layout='split'] .gridColumn";

describe('shelf-split home tabs view transition', () => {
    it('should move the tabs transition name to the second child only beside the player card', () => {
        expect(cssDeclarations(css, `${SPLIT} > :first-child`)['view-transition-name']).toBe(
            'none',
        );
        expect(cssDeclarations(css, `${SPLIT} > :nth-child(2)`)['view-transition-name']).toBe(
            'home-tabs',
        );
    });

    it('should not rename the grid children in other shelf layouts', () => {
        for (const selector of [
            'main.wide[data-shelf] .gridColumn > :first-child',
            'main.wide[data-shelf] .gridColumn > :nth-child(2)',
        ]) {
            expect(cssDeclarations(css, selector)).toEqual({});
        }
    });
});
