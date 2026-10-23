// @vitest-environment node
// 已收聽嘅集數要一眼睇得出（淡色），但唔用 opacity：行仲撳得（重聽），字要過 WCAG AA
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const css = readCss(new URL('./EpisodeList.module.css', import.meta.url));
const MUTED = 'var(--color-text-muted)';

describe('watched episode rows', () => {
    it('fade every piece of text to the muted colour', () => {
        expect(cssDeclarations(css, '.watched:not(.current) .dayMonth').color).toBe(MUTED);
        expect(cssDeclarations(css, '.watched:not(.current) .dayMonth')['font-weight']).toBe('500');
        expect(cssDeclarations(css, '.watched:not(.current) .status').color).toBe(MUTED);
        expect(cssDeclarations(css, '.watched:not(.current) .play').color).toBe(MUTED);
    });

    it('fade the progress bar and the tick instead of using the theme colour', () => {
        expect(cssDeclarations(css, '.watched:not(.current) .fill').background).toBe(MUTED);
        expect(cssDeclarations(css, '.watched:not(.current) .check').background).toBe(MUTED);
    });

    it('do not fade the whole row with opacity (text contrast would drop below AA)', () => {
        expect(cssDeclarations(css, '.watched').opacity).toBeUndefined();
    });

    it('leave the episode being replayed highlighted', () => {
        expect(cssDeclarations(css, '.watched .dayMonth')).toEqual({});
    });
});
