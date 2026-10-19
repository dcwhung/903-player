import { render, screen } from '@testing-library/react';
import { SHOW_THEMES } from '../../config/showThemes';
import { ThemeScope } from './ThemeScope';

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
});
