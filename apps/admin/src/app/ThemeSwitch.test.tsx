import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeSwitch } from './ThemeSwitch';
import { THEME_KEY } from './themePref';

describe('ThemeSwitch', () => {
    afterEach(() => {
        localStorage.clear();
        delete document.documentElement.dataset.theme;
    });

    it('should start on 跟系統 and switch to dark with three icon buttons', async () => {
        render(<ThemeSwitch mini={false} />);
        expect(screen.getByRole('button', { name: '跟隨系統' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await userEvent.click(screen.getByRole('button', { name: '深色' }));
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        expect(screen.getByRole('button', { name: '深色' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('should cycle with one button when the nav is collapsed', async () => {
        render(<ThemeSwitch mini />);
        await userEvent.click(screen.getByRole('button', { name: /主題：跟隨系統/ }));
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
        await userEvent.click(screen.getByRole('button', { name: /主題：淺色/ }));
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        await userEvent.click(screen.getByRole('button', { name: /主題：深色/ }));
        expect(document.documentElement).not.toHaveAttribute('data-theme');
    });
});
