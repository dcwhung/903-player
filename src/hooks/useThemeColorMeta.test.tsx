import { renderHook } from '@testing-library/react';
import { useThemeColorMeta } from './useThemeColorMeta';

const themeColor = () =>
    document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

const addMeta = (content: string) => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = content;
    document.head.append(meta);
};

describe('useThemeColorMeta', () => {
    afterEach(() => {
        document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    });

    it('should set the existing meta and restore it when unmounted', () => {
        addMeta('#4f749c');
        const { unmount } = renderHook(() => useThemeColorMeta('#111111'));

        expect(themeColor()).toBe('#111111');
        expect(document.head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);

        unmount();
        expect(themeColor()).toBe('#4f749c');
    });

    it('should create the meta when missing and remove it when unmounted', () => {
        const { unmount } = renderHook(() => useThemeColorMeta('#111111'));

        expect(themeColor()).toBe('#111111');

        unmount();
        expect(themeColor()).toBeUndefined();
    });

    it('should follow a changed colour and still restore the original', () => {
        addMeta('#4f749c');
        const { rerender, unmount } = renderHook(({ color }) => useThemeColorMeta(color), {
            initialProps: { color: '#111111' },
        });

        rerender({ color: '#222222' });
        expect(themeColor()).toBe('#222222');

        unmount();
        expect(themeColor()).toBe('#4f749c');
    });

    it('should leave the meta alone when no colour is given', () => {
        addMeta('#4f749c');
        renderHook(() => useThemeColorMeta(undefined));

        expect(themeColor()).toBe('#4f749c');
    });
});
