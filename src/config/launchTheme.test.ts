// ?raw：Vite 直接畀返原始 HTML 字串，jsdom 環境都唔使經 node:fs
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
