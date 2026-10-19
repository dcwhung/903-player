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
        render(
            <ThemeScope theme={SHOW_THEMES.sunnyday}>
                <ThemeScope theme={SHOW_THEMES.badgirl} fullPage={false}>
                    <p>mini player</p>
                </ThemeScope>
            </ThemeScope>,
        );

        expect(themeColor()).toBe(SHOW_THEMES.sunnyday.bg);
    });
});
