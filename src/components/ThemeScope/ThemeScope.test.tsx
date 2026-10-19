import { render, screen } from '@testing-library/react';
import { SHOW_THEMES } from '../../config/showThemes';
import { ThemeScope } from './ThemeScope';

describe('ThemeScope', () => {
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
});
