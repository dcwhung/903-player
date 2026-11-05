// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { atRuleDeclarations, cssDeclarations, readCss } from '../../../../../tests/cssRule';

const tokensCss = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const tabsCss = readCss(new URL('./HomeTabs.module.css', import.meta.url));

/** tokens.css 有宣告嘅 custom property → 值 */
const TOKENS = new Map(
    [...tokensCss.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
        name,
        value?.trim(),
    ]),
);
const undeclared = (declarations: Record<string, string>) =>
    Object.values(declarations)
        .flatMap((value) => [...value.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name))
        .filter((name) => !TOKENS.has(name ?? ''));

// 減少動畫：CSS transition 只喺冇要求減少動畫先有，否則即刻換
const MOTION = '@media (prefers-reduced-motion: no-preference)';
const MOVE = 'var(--view-transition-move) var(--ease-view-transition)';
const TRAIL = `${MOVE} var(--home-tab-trail-delay)`;
const PILL = '.pill';
const RIGHT = `${PILL}[data-direction='right']`;
const LEFT = `${PILL}[data-direction='left']`;

/** _mockups_/elastic-tabs E2：一粒膠囊，前面嗰邊先郁，後面嗰邊遲啲跟 */
describe('home tab pill (P5 #1 elastic)', () => {
    it('should declare the trailing delay as a ratio of the move duration', () => {
        expect(TOKENS.get('--home-tab-trail-ratio')).toBe('0.3');
        expect(TOKENS.get('--home-tab-trail-delay')).toBe(
            'calc(var(--view-transition-move) * var(--home-tab-trail-ratio))',
        );
        expect(TOKENS.get('--home-tab-label-fade')).toBe('calc(var(--view-transition-move) / 2)');
    });

    it('should place one accent pill inside the track, inset by --home-tab-inset', () => {
        const pill = cssDeclarations(tabsCss, PILL);
        expect(cssDeclarations(tabsCss, '.tabs').position).toBe('relative');
        expect(pill.position).toBe('absolute');
        expect(pill.background).toBe('var(--color-accent)');
        expect(pill.top).toBe('var(--home-tab-inset)');
        expect(pill.bottom).toBe('var(--home-tab-inset)');
        expect(undeclared(pill)).toEqual([]);
    });

    it('should cover each half of the track with left / right (no 我的收藏 tab)', () => {
        const shows = cssDeclarations(tabsCss, `${PILL}[data-tab='shows']`);
        const dramas = cssDeclarations(tabsCss, `${PILL}[data-tab='dramas']`);
        // 冇收藏：--home-tab-saved-room 係 0，即係半條軌道
        expect(cssDeclarations(tabsCss, '.tabs')['--home-tab-saved-room']).toBe('0px');
        expect(shows).toEqual({
            left: 'var(--home-tab-inset)',
            right: 'calc(var(--home-tab-far) + var(--home-tab-saved-room) / 2)',
        });
        expect(dramas).toEqual({
            left: 'calc(var(--home-tab-far) - var(--home-tab-saved-room) / 2)',
            right: 'calc(var(--home-tab-inset) + var(--home-tab-saved-room))',
        });
        expect(TOKENS.get('--home-tab-far')).toBe('calc(50% + var(--home-tab-inset) / 2)');
    });

    it('should make room for the narrow 我的收藏 tab and put the pill on it', () => {
        expect(cssDeclarations(tabsCss, ".tabs[data-saved='true']")).toEqual({
            '--home-tab-saved-room': 'calc(var(--home-tab-icon-width) + var(--home-tab-inset))',
        });
        expect(cssDeclarations(tabsCss, `${PILL}[data-tab='saved']`)).toEqual({
            left: 'calc(100% - var(--home-tab-inset) - var(--home-tab-icon-width))',
            right: 'var(--home-tab-inset)',
        });
        expect(cssDeclarations(tabsCss, '.icon').flex).toBe('0 0 var(--home-tab-icon-width)');
        expect(TOKENS.has('--home-tab-icon-width')).toBe(true);
    });

    it('should collapse and fade the 我的收藏 tab when there is nothing saved', () => {
        expect(cssDeclarations(tabsCss, ".icon[data-gone='true']")).toMatchObject({
            'flex-basis': '0',
            'margin-left': 'calc(-1 * var(--home-tab-inset))',
            opacity: '0',
        });
        const motion = atRuleDeclarations(tabsCss, MOTION, '.icon');
        expect(motion.transition).toContain('flex-basis var(--view-transition-move)');
        expect(motion.transition).toContain('opacity var(--view-transition-move)');
        expect(undeclared(motion)).toEqual([]);
    });

    it('should stop the pressed button painting its own background', () => {
        const pressed = cssDeclarations(tabsCss, ".tab[aria-pressed='true']");
        expect(pressed.background).toBeUndefined();
        expect(pressed.color).toBe('var(--color-on-accent)');
        expect(pressed['font-weight']).toBe('700');
        // 掣要疊喺膠囊上面（同為 positioned，後寫嘅喺上）
        expect(cssDeclarations(tabsCss, '.tab').position).toBe('relative');
    });

    it('should delay the left (trailing) edge when moving right', () => {
        const rule = atRuleDeclarations(tabsCss, MOTION, RIGHT);
        expect(rule.transition).toBe(`right ${MOVE}, left ${TRAIL}`);
        expect(undeclared(rule)).toEqual([]);
    });

    it('should delay the right (trailing) edge when moving left', () => {
        const rule = atRuleDeclarations(tabsCss, MOTION, LEFT);
        expect(rule.transition).toBe(`left ${MOVE}, right ${TRAIL}`);
        expect(undeclared(rule)).toEqual([]);
    });

    it('should fade the label colour over half the move', () => {
        const rule = atRuleDeclarations(tabsCss, MOTION, '.tab');
        expect(rule.transition).toBe(
            'color var(--home-tab-label-fade) var(--ease-view-transition)',
        );
        expect(undeclared(rule)).toEqual([]);
    });

    it('should only transition under prefers-reduced-motion: no-preference', () => {
        for (const selector of [PILL, RIGHT, LEFT, '.tab', '.icon', ".tab[aria-pressed='true']"]) {
            expect(cssDeclarations(tabsCss, selector).transition).toBeUndefined();
        }
        // 換 tab（左 / 右）、字色、我的收藏 tab 闊度、膠囊跟格仔闊度
        expect(tabsCss.match(/transition:/g)).toHaveLength(5);
        expect(atRuleDeclarations(tabsCss, MOTION, PILL).transition).toBe(
            `left ${MOVE}, right ${MOVE}`,
        );
    });
});
