// ?raw：HTML 由 Vite 直接畀返原始字串（CSS 就唔得，tokens.css 一致性測試見 scripts/launchThemeTokens.test.ts）
import indexHtml from '../../index.html?raw';
import { LAUNCH_THEME_COLOR } from './launchTheme';
import { HOME_THEME } from './showThemes';

describe('LAUNCH_THEME_COLOR', () => {
    it('should equal the home page top colour', () => {
        expect(LAUNCH_THEME_COLOR).toBe(HOME_THEME.bg);
    });

    it('should be the initial theme-color in index.html', () => {
        const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
        const meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

        expect(meta?.content).toBe(LAUNCH_THEME_COLOR);
    });
});
