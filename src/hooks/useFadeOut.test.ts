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
});
