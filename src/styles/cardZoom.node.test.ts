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
        value?.trim().replace(/\s+/g, ' '),
    ]),
);
const undeclared = (declarations: Record<string, string>) =>
    Object.values(declarations)
        .flatMap((value) => [...value.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name))
        .filter((name) => !TOKENS.has(name ?? ''));

// 減少動畫：JS 已經唔開過場；CSS 動畫只喺冇要求減少動畫先有
const MOTION = '@media (prefers-reduced-motion: no-preference)';
const ZOOM = "html[data-view-transition='zoom']";
const UNZOOM = "html[data-view-transition='unzoom']";
const DURING = "html:is([data-view-transition='zoom'], [data-view-transition='unzoom'])";
const MOVE = 'var(--view-transition-move) var(--ease-view-transition) both';

const keyframe = (name: string, step: string) =>
    atRuleDeclarations(global, `@keyframes ${name}`, step);
const motionRule = (selector: string) => atRuleDeclarations(global, MOTION, selector);

/** Z3（_mockups_/card-zoom）：得 root 同被撳嗰格有名，其他（連 inline style）一律熄 */
describe('card zoom names', () => {
    it('should drop every other name while zooming, even inline ones', () => {
        expect(cssDeclarations(global, `${DURING} *`)['view-transition-name']).toBe(
            'none !important',
        );
    });

    it('should name only the tapped tile zoom-tile', () => {
        expect(TRANSITION_NAME.zoomTile).toBe('zoom-tile');
        expect(
            cssDeclarations(global, `${DURING} [data-zoom-source]`)['view-transition-name'],
        ).toBe(`${TRANSITION_NAME.zoomTile} !important`);
    });

    it('should not give the tile a name outside a zoom', () => {
        expect(global).not.toMatch(/(^|\n)\s*\[data-zoom-source\]\s*\{/);
    });
});

/** 入頁：內頁由格仔個框開窗咁展開到成頁，主頁變暗 */
describe('zooming into an inner page', () => {
    const page = motionRule(`${ZOOM}::view-transition-new(root)`);
    const home = motionRule(`${ZOOM}::view-transition-old(root)`);

    it('should open the page out of the tile box over the move duration', () => {
        expect(page.animation).toBe(`zoom-page-open ${MOVE}`);
        expect(keyframe('zoom-page-open', 'from')).toEqual({
            'clip-path': 'var(--zoom-tile-clip)',
            opacity: 'var(--card-zoom-page-opacity)',
        });
        expect(keyframe('zoom-page-open', 'to')).toEqual({
            'clip-path': 'inset(0 round 0)',
            opacity: '1',
        });
    });

    it('should dim the home page behind it', () => {
        expect(home.animation).toBe(`zoom-home-dim ${MOVE}`);
        expect(keyframe('zoom-home-dim', 'to')).toEqual({
            opacity: 'var(--card-zoom-home-opacity)',
        });
    });

    it('should lay the page over the home page instead of adding their light', () => {
        expect(page['mix-blend-mode']).toBe('normal');
        expect(home['mix-blend-mode']).toBe('normal');
        expect(undeclared({ ...page, ...home })).toEqual([]);
    });
});

/** 窄版返回：zoom 倒轉，內頁縮返入格仔框（要疊喺主頁上面），主頁變返光 */
describe('unzooming back home', () => {
    const page = motionRule(`${UNZOOM}::view-transition-old(root)`);
    const home = motionRule(`${UNZOOM}::view-transition-new(root)`);

    it('should shrink the page back into the tile box, on top of the home page', () => {
        expect(page.animation).toBe(`zoom-page-close ${MOVE}`);
        expect(page['z-index']).toBe('1');
        expect(keyframe('zoom-page-close', 'from')).toEqual({ 'clip-path': 'inset(0 round 0)' });
        expect(keyframe('zoom-page-close', 'to')).toEqual({
            'clip-path': 'var(--zoom-tile-clip)',
            opacity: 'var(--card-zoom-page-opacity)',
        });
    });

    it('should brighten the home page back', () => {
        expect(home.animation).toBe(`zoom-home-undim ${MOVE}`);
        expect(keyframe('zoom-home-undim', 'from')).toEqual({
            opacity: 'var(--card-zoom-home-opacity)',
        });
        expect(page['mix-blend-mode']).toBe('normal');
        expect(home['mix-blend-mode']).toBe('normal');
        expect(undeclared({ ...page, ...home })).toEqual([]);
    });

    it('should leave the tile to the shared late fade-in', () => {
        expect(global).not.toMatch(/::view-transition-new\(zoom-tile\)/);
    });
});

describe('card zoom tokens', () => {
    it('should keep the mockup opacities as tokens', () => {
        expect(TOKENS.get('--card-zoom-page-opacity')).toBe('0.4');
        expect(TOKENS.get('--card-zoom-home-opacity')).toBe('0.35');
    });

    it('should clip to the tile box with the tile corner radius', () => {
        expect(TOKENS.get('--zoom-tile-clip')).toBe(
            'inset( var(--zoom-inset-top) var(--zoom-inset-right) var(--zoom-inset-bottom) var(--zoom-inset-left) round var(--radius-tile) )',
        );
        ['top', 'right', 'bottom', 'left'].forEach((side) =>
            expect(TOKENS.get(`--zoom-inset-${side}`)).toBe('0px'),
        );
    });
});
