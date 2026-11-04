import { act, renderHook } from '@testing-library/react';
import { useFadeOut } from './useFadeOut';

const keyOf = (value: string) => value;

interface Props {
    value: string | null;
    fade?: boolean;
}

const render = (initial: Props) =>
    renderHook(({ value, fade }: Props) => useFadeOut(value, keyOf, { fade }), {
        initialProps: initial,
    });

describe('useFadeOut', () => {
    it('should keep showing the last value while it fades out', () => {
        const { result, rerender } = render({ value: 'a' });

        rerender({ value: null });

        expect(result.current).toMatchObject({ shown: 'a', leaving: true });
        act(() => result.current.onLeft());
        expect(result.current).toMatchObject({ shown: null, leaving: false });
    });

    it('should drop the value straight away when it goes without a fade', () => {
        const { result, rerender } = render({ value: 'a' });

        rerender({ value: null, fade: false });

        expect(result.current).toMatchObject({ shown: null, leaving: false });
    });

    it('should stop a fade that is under way once fading is no longer wanted', () => {
        const { result, rerender } = render({ value: 'a' });
        rerender({ value: null });

        rerender({ value: null, fade: false });

        expect(result.current).toMatchObject({ shown: null, leaving: false });
    });

    it('should not bring back a stale value to fade later', () => {
        const { result, rerender } = render({ value: 'a' });
        rerender({ value: null, fade: false });

        rerender({ value: null, fade: true });

        expect(result.current).toMatchObject({ shown: null, leaving: false });
    });

    describe('reduced motion (S-668)', () => {
        let reduced = false;
        beforeEach(() => {
            reduced = false;
            vi.stubGlobal(
                'matchMedia',
                vi.fn((query: string) => ({
                    get matches() {
                        return reduced && query.includes('prefers-reduced-motion');
                    },
                    media: query,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                })),
            );
        });
        afterEach(() => vi.unstubAllGlobals());

        it('should read the setting when the value goes, not from an earlier render', () => {
            const { result, rerender } = render({ value: 'a' });
            reduced = true;

            rerender({ value: null });

            expect(result.current).toMatchObject({ shown: null, leaving: false });
        });

        it('should keep the fade decided when it began, leaving its end to the handle', () => {
            const { result, rerender } = render({ value: 'a' });
            rerender({ value: null });
            reduced = true;

            // CSS 嘅 media query 會停咗個動畫：由 animationcancel / 後備 timer 叫 onLeft（S-666）
            rerender({ value: null });

            expect(result.current).toMatchObject({ shown: 'a', leaving: true });
            act(() => result.current.onLeft());
            expect(result.current).toMatchObject({ shown: null, leaving: false });
        });

        it('should fade again next time once reduced motion is turned off', () => {
            reduced = true;
            const { result, rerender } = render({ value: 'a' });
            rerender({ value: null });
            reduced = false;
            rerender({ value: 'b' });

            rerender({ value: null });

            expect(result.current).toMatchObject({ shown: 'b', leaving: true });
        });
    });
});
