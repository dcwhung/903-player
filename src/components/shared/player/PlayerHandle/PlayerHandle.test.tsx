import { act, fireEvent, render, screen } from '@testing-library/react';
import { themeFor } from '../../../../catalog/shows';
import { PlayerHandle, type PlayerHandleProps } from './PlayerHandle';

const FADE_VAR = '--duration-page-handle-fade';
const FADE_MS = 240;

const cancelAnimation = (element: Element) =>
    fireEvent(element, new AnimationEvent('animationcancel', { bubbles: true }));

const renderHandle = (props: Partial<PlayerHandleProps> = {}) => {
    const onLeft = vi.fn();
    const onActivate = vi.fn();
    const view = render(
        <PlayerHandle
            variant="page"
            theme={themeFor('gongzi')}
            name="公子會"
            status="playing"
            label="播放中：公子會，返回主頁"
            onActivate={onActivate}
            onLeft={onLeft}
            {...props}
        />,
    );
    const handle = view.container.querySelector<HTMLElement>('[data-page-handle]');
    if (!handle) throw new Error('no handle');
    return { ...view, handle, onLeft, onActivate };
};

describe('PlayerHandle', () => {
    describe('leaving safety net (S-666)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            document.documentElement.style.setProperty(FADE_VAR, `${FADE_MS}ms`);
        });
        afterEach(() => {
            vi.useRealTimers();
            document.documentElement.style.removeProperty(FADE_VAR);
        });

        it('should finish leaving when its fade is cancelled', () => {
            const { handle, onLeft } = renderHandle({ leaving: true });

            cancelAnimation(handle);

            expect(onLeft).toHaveBeenCalled();
        });

        it('should ignore animations cancelled inside the handle', () => {
            const { handle, onLeft } = renderHandle({ leaving: true });

            cancelAnimation(handle.firstElementChild as Element);

            expect(onLeft).not.toHaveBeenCalled();
        });

        it('should finish leaving after the fade token’s duration even without animation events', () => {
            const { onLeft } = renderHandle({ leaving: true });

            act(() => vi.advanceTimersByTime(FADE_MS - 1));
            expect(onLeft).not.toHaveBeenCalled();
            act(() => vi.advanceTimersByTime(1));
            expect(onLeft).toHaveBeenCalledTimes(1);
        });

        it('should not time out while it is not leaving', () => {
            const { onLeft } = renderHandle();

            act(() => vi.advanceTimersByTime(FADE_MS * 2));

            expect(onLeft).not.toHaveBeenCalled();
        });

        it('should still be removed when the fade token cannot be read', () => {
            document.documentElement.style.removeProperty(FADE_VAR);
            const { onLeft } = renderHandle({ leaving: true });

            act(() => vi.runAllTimers());

            expect(onLeft).toHaveBeenCalled();
        });
    });
});
