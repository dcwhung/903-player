import { THEME_KEY, applyTheme, nextTheme, readThemePref, writeThemePref } from './themePref';

describe('theme preference', () => {
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        delete document.documentElement.dataset.theme;
    });

    it('should follow the system by default', () => {
        expect(readThemePref()).toBe('system');
        applyTheme(readThemePref());
        expect(document.documentElement).not.toHaveAttribute('data-theme');
    });

    it('should write the choice to localStorage and set data-theme on <html>', () => {
        writeThemePref('dark');
        expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        expect(readThemePref()).toBe('dark');
        applyTheme('dark');
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        applyTheme('system');
        expect(document.documentElement).not.toHaveAttribute('data-theme');
    });

    it('should fall back to the system when storage is unknown or throws', () => {
        localStorage.setItem(THEME_KEY, 'purple');
        expect(readThemePref()).toBe('system');
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readThemePref()).toBe('system');
        expect(() => writeThemePref('light')).not.toThrow();
    });

    it('should cycle system → light → dark → system for the collapsed button', () => {
        expect([nextTheme('system'), nextTheme('light'), nextTheme('dark')]).toEqual([
            'light',
            'dark',
            'system',
        ]);
    });
});
