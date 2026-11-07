// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { atRuleDeclarations, cssDeclarations, readCss } from '../../tests/cssRule';
import { TRANSITION_NAME } from '../utils/transitionNames';

const global = readCss(new URL('./global.css', import.meta.url));
const tokensCss = readCss(new URL('./tokens.css', import.meta.url));

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

// 減少動畫：JS 已經唔開過場；CSS 動畫只喺冇要求減少動畫先有
const MOTION = '@media (prefers-reduced-motion: no-preference)';
const OPEN = "html[data-view-transition='open']";
const SWITCH = "html[data-view-transition='switch']";
const PANEL = TRANSITION_NAME.panel;

const keyframe = (name: string, step: string) =>
    atRuleDeclarations(global, `@keyframes ${name}`, step);

/** _mockups_/player-card-motion O1：由右 slide 入 + 淡入 */
describe('opening the home player card', () => {
    const rule = atRuleDeclarations(
        global,
        MOTION,
        `${OPEN}::view-transition-new(${PANEL}):only-child`,
    );

    it('should slide the new card in over the move duration with the view transition easing', () => {
        expect(rule.animation).toBe(
            'card-open var(--view-transition-move) var(--ease-view-transition) both',
        );
        expect(undeclared(rule)).toEqual([]);
    });

    it('should start off to the right of its place, transparent', () => {
        expect(keyframe('card-open', 'from')).toEqual({
            transform: 'translateX(var(--card-open-offset))',
            opacity: '0',
        });
        expect(TOKENS.get('--card-open-offset')).toBe('110%');
    });
});

/** S3：成張卡反轉，前半舊卡轉走（ease-in），後半新卡轉返嚟 */
describe('switching the home player card to another show', () => {
    const out = atRuleDeclarations(global, MOTION, `${SWITCH}::view-transition-old(${PANEL})`);
    const into = atRuleDeclarations(global, MOTION, `${SWITCH}::view-transition-new(${PANEL})`);

    it('should turn the old card away over the first half', () => {
        expect(out.animation).toBe('card-flip-out var(--card-flip-half) ease-in both');
        expect(TOKENS.get('--card-flip-half')).toBe('calc(var(--view-transition-move) / 2)');
    });

    it('should turn the new card in over the second half', () => {
        expect(into.animation).toBe(
            'card-flip-in var(--card-flip-half) var(--ease-view-transition) var(--card-flip-half) both',
        );
        expect(undeclared({ ...out, ...into })).toEqual([]);
    });

    it.each([
        ['card-flip-out', 'to', 'rotateY(calc(-1 * var(--card-flip-angle)))'],
        ['card-flip-in', 'from', 'rotateY(var(--card-flip-angle))'],
    ])('should rotate %s at %s with perspective', (name, step, rotate) => {
        expect(keyframe(name, step).transform).toBe(
            `perspective(var(--card-flip-perspective)) ${rotate}`,
        );
        expect(TOKENS.get('--card-flip-angle')).toBe('90deg');
        expect(TOKENS.has('--card-flip-perspective')).toBe(true);
    });
});

/** 開卡 / 換節目：成張卡（連半浮嘅 ✕）一齊郁；把手唔再變形做張卡 */
describe('home player card names while opening or switching', () => {
    const DURING = "html:is([data-view-transition='open'], [data-view-transition='switch'])";

    it('should move the card name to its theme scope, so the corner ✕ moves with it', () => {
        const scope = cssDeclarations(
            global,
            `${DURING} [data-theme-scope]:has(> [data-home-card])`,
        );
        const card = cssDeclarations(global, `${DURING} [data-home-card]`);
        expect(scope['view-transition-name']).toBe(PANEL);
        expect(card['view-transition-name']).toBe('none !important');
    });
});
