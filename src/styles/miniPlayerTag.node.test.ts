// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';

const tokens = readCss(new URL('./tokens.css', import.meta.url));
const miniPlayer = readCss(
    new URL('../components/MiniPlayer/MiniPlayer.module.css', import.meta.url),
);
const pageDots = readCss(new URL('../components/PageDots/PageDots.module.css', import.meta.url));
const root = cssDeclarations(tokens, ':root');

// 用戶揀定（T9 B）：「今日」= 主頁奶油金、深藍字；「重溫」= 固定藍色（唔跟節目強調色）
describe('mini player tags', () => {
    it('should paint 今日 in the home gold with dark blue text, whatever the show theme', () => {
        expect(root['--color-gold']).toBe('#f5d294');
        expect(root['--today-tag-bg']).toBe('var(--color-gold)');
        expect(root['--today-tag-text']).toBe('var(--color-today-tile-text)');
        expect(cssDeclarations(miniPlayer, ".tag[data-tag='today']")).toMatchObject({
            background: 'var(--today-tag-bg)',
            color: 'var(--today-tag-text)',
        });
    });

    it('should paint 重溫 in a fixed blue, whatever the show accent', () => {
        expect(root['--color-rewatch']).toBe('#8ec6ef');
        expect(root['--color-on-rewatch']).toBe('#10161d');
        expect(cssDeclarations(miniPlayer, ".tag[data-tag='rewatch']")).toMatchObject({
            background: 'var(--color-rewatch)',
            color: 'var(--color-on-rewatch)',
        });
    });
});

describe('page dot variants', () => {
    it('should draw the blue variant in the 重溫 blue: faded while not current, full when current', () => {
        expect(root['--dot-variant-opacity']).toBe('0.6');
        expect(cssDeclarations(pageDots, '.blue::after')).toMatchObject({
            background: 'var(--color-rewatch)',
            opacity: 'var(--dot-variant-opacity)',
        });
        expect(cssDeclarations(pageDots, '.selected::after').opacity).toBe('1');
        expect(cssDeclarations(pageDots, '.blue.selected::after').background).toBe(
            'var(--color-rewatch)',
        );
    });

    it('should draw the current gold dot in the 今日 tag gold, leaving it plain while not current', () => {
        expect(cssDeclarations(pageDots, '.gold.selected::after').background).toBe(
            'var(--color-gold)',
        );
        expect(cssDeclarations(pageDots, '.gold::after')).toEqual({});
    });
});
