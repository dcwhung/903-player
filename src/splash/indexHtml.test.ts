// ?raw：攞 index.html 原始字串，檢查啟動畫面同字體載入方式冇俾人改走
import indexHtml from '../../index.html?raw';
import { SPLASH_HIDDEN_CLASS, SPLASH_ID } from './hideSplash';

const GOOGLE_FONTS_HOST = 'fonts.googleapis.com/css2';
const doc = new DOMParser().parseFromString(indexHtml, 'text/html');

describe('index.html', () => {
    it('should render the splash outside #root so React does not wipe it', () => {
        const splash = doc.getElementById(SPLASH_ID);

        expect(splash).not.toBeNull();
        expect(doc.getElementById('root')?.contains(splash)).toBe(false);
    });

    it('should style the hidden splash inline', () => {
        expect(indexHtml).toContain(`.${SPLASH_HIDDEN_CLASS}`);
    });

    it('should paint the canvas outside the viewport in the splash colour until the fade starts', () => {
        expect(indexHtml).toMatch(
            new RegExp(
                String.raw`html:has\(#splash:not\(\.${SPLASH_HIDDEN_CLASS}\)\)\s*\{\s*background: var\(--splash-canvas\)`,
            ),
        );
    });

    it('should show the build-time app version on the splash', () => {
        expect(doc.querySelector('.splash-version')?.textContent).toBe('v%APP_VERSION%');
    });

    it('should not block first paint on Google Fonts', () => {
        // DOMParser 唔行 script，noscript 入面嘅 fallback 會當普通元素 parse，要剔走
        const blocking = [...doc.head.querySelectorAll('link[rel="stylesheet"]')].filter(
            (link) =>
                link.getAttribute('href')?.includes(GOOGLE_FONTS_HOST) &&
                link.parentElement?.tagName !== 'NOSCRIPT',
        );
        const preload = doc.head.querySelector(
            `link[rel="preload"][as="style"][href*="${GOOGLE_FONTS_HOST}"]`,
        );

        expect(blocking).toHaveLength(0);
        expect(preload).not.toBeNull();
    });
});
