// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const mini = readCss(new URL('./MiniPlayer.module.css', import.meta.url));

/*
 * 浮起嘅放大（scale）specificity 高過 .player 嘅 translateX：只可以掛喺 data-lifted（JS 已經排除咗
 * 拉緊、停喺關閉掣、滑走緊），否則全拉關閉時張 card 會彈返中間先消失（jsdom 睇唔到 CSS cascade）
 */
describe('mini player swipe-to-close CSS', () => {
    it('should only scale the lifted card while it rests in place', () => {
        expect(cssDeclarations(mini, ".player[data-lifted='true']").transform).toBe(
            'scale(var(--mini-lift-scale))',
        );
        expect(cssDeclarations(mini, ".player[data-armed='true']").transform).toBeUndefined();
    });

    it('should move the card with the dismiss offset otherwise', () => {
        expect(cssDeclarations(mini, '.player').transform).toBe(
            'translateX(calc(var(--mini-dismiss-offset, 0px) * -1))',
        );
    });
});
