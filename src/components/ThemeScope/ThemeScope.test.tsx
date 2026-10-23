import { render, screen } from '@testing-library/react';
import { DRAMA_THEMES } from '../../config/dramaThemes';
import { SHOW_THEMES } from '../../config/showThemes';
import { ThemeScope } from './ThemeScope';

const canvas = () => document.documentElement.style.getPropertyValue('--page-canvas');

const themeColor = () =>
    document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

describe('ThemeScope', () => {
    afterEach(() => {
        document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    });

    it('applies the show theme as CSS variables on its root', () => {
        render(
            <ThemeScope theme={SHOW_THEMES.sunnyday}>
                <p>內容</p>
            </ThemeScope>,
        );

        const scope = screen.getByText('內容').parentElement as HTMLElement;
        expect(scope).toHaveAttribute('data-theme-scope');
        expect(scope.style.getPropertyValue('--theme-bg')).toBe('#0e2230');
    });

    it('should set theme-color to the theme bg when it is full page', () => {
        render(
            <ThemeScope theme={SHOW_THEMES.sunnyday}>
                <p>內容</p>
            </ThemeScope>,
        );

        expect(themeColor()).toBe(SHOW_THEMES.sunnyday.bg);
    });

    it('should not touch theme-color when it is not full page', () => {
        // 單獨 render（冇外層成頁 scope 覆寫），先驗證到 fullPage={false} 真係唔郁 meta
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = SHOW_THEMES.sunnyday.bg;
        document.head.append(meta);

        render(
            <ThemeScope theme={SHOW_THEMES.badgirl} fullPage={false}>
                <p>mini player</p>
            </ThemeScope>,
        );

        expect(themeColor()).toBe(SHOW_THEMES.sunnyday.bg);
        expect(document.head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    });

    it('should paint the page canvas (behind the home indicator) and clear it on unmount', () => {
        const { unmount } = render(
            <ThemeScope theme={SHOW_THEMES.sunnyday}>
                <p>內容</p>
            </ThemeScope>,
        );

        expect(canvas()).toBe(SHOW_THEMES.sunnyday.bg);

        unmount();
        expect(canvas()).toBe('');
    });

    it('should use the given canvas colour, e.g. the bottom of the home gradient', () => {
        render(
            <ThemeScope theme={SHOW_THEMES.sunnyday} canvas="var(--home-bg-bottom)">
                <p>內容</p>
            </ThemeScope>,
        );

        expect(canvas()).toBe('var(--home-bg-bottom)');
    });

    it('should leave the page canvas alone when it is not full page', () => {
        render(
            <ThemeScope theme={SHOW_THEMES.badgirl} fullPage={false}>
                <p>mini player</p>
            </ThemeScope>,
        );

        expect(canvas()).toBe('');
    });

    it('marks a light theme so the browser uses light form controls and scrollbars', () => {
        render(
            <ThemeScope theme={DRAMA_THEMES.chisee}>
                <p>內容</p>
            </ThemeScope>,
        );

        const scope = screen.getByText('內容').parentElement as HTMLElement;
        expect(scope).toHaveAttribute('data-scheme', 'light');
    });

    it('should paint a status bar band and use its colour for theme-color on a light page', () => {
        const { container } = render(
            <ThemeScope theme={DRAMA_THEMES.c18}>
                <p>內容</p>
            </ThemeScope>,
        );

        expect(themeColor()).toBe(DRAMA_THEMES.c18.statusBar);
        const band = container.querySelector('[data-status-band]') as HTMLElement;
        expect(band).toHaveAttribute('aria-hidden', 'true');
        expect(band.style.background).toBe('rgb(165, 42, 36)');
        // 畫面底色照用 bg（home indicator 後面同頁面一樣色）
        expect(canvas()).toBe(DRAMA_THEMES.c18.bg);
    });

    it('should not paint a status bar band for dark themes or partial scopes', () => {
        const { container } = render(
            <>
                <ThemeScope theme={SHOW_THEMES.sunnyday}>
                    <p>節目</p>
                </ThemeScope>
                <ThemeScope theme={DRAMA_THEMES.c18} fullPage={false}>
                    <p>mini player</p>
                </ThemeScope>
            </>,
        );

        expect(container.querySelector('[data-status-band]')).toBeNull();
        expect(screen.getByText('節目').parentElement).not.toHaveAttribute('data-scheme');
    });
});
