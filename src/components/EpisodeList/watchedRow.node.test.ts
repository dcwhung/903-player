// @vitest-environment node
// 已收聽嘅集數要一眼睇得出：淡色字再向背景色淡 25%（--color-watched，用戶要求），唔用 opacity
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const css = readCss(new URL('./EpisodeList.module.css', import.meta.url));
const WATCHED = 'var(--color-watched)';

describe('watched episode rows', () => {
    it('fade every piece of text to the watched colour', () => {
        expect(cssDeclarations(css, '.watched:not(.current) .dayMonth').color).toBe(WATCHED);
        expect(cssDeclarations(css, '.watched:not(.current) .dayMonth')['font-weight']).toBe('500');
        expect(cssDeclarations(css, '.watched:not(.current) .status').color).toBe(WATCHED);
        expect(cssDeclarations(css, '.watched:not(.current) .play').color).toBe(WATCHED);
        expect(cssDeclarations(css, '.watched:not(.current) .weekday').color).toBe(WATCHED);
    });

    it('fade the progress bar and the tick instead of using the theme colour', () => {
        expect(cssDeclarations(css, '.watched:not(.current) .fill').background).toBe(WATCHED);
        expect(cssDeclarations(css, '.watched:not(.current) .check').background).toBe(WATCHED);
    });

    it('do not fade the whole row with opacity', () => {
        expect(cssDeclarations(css, '.watched').opacity).toBeUndefined();
    });

    it('leave the episode being replayed highlighted', () => {
        expect(cssDeclarations(css, '.watched .dayMonth')).toEqual({});
    });
});

const tokens = readCss(new URL('../../styles/tokens.css', import.meta.url));

describe('--color-watched', () => {
    it('falls back to the muted colour, and mixes it 25% toward the background where supported', () => {
        expect(tokens).toContain('--color-watched: var(--color-text-muted);');
        expect(tokens).toContain(
            '--color-watched: color-mix(in srgb, var(--color-text-muted) 75%, var(--color-bg));',
        );
        // 混色要寫喺後備值後面，否則同 specificity 嘅後備值會蓋返佢
        expect(tokens.indexOf('color-mix(in srgb, var(--color-text-muted)')).toBeGreaterThan(
            tokens.indexOf('--color-watched: var(--color-text-muted);'),
        );
    });
});
