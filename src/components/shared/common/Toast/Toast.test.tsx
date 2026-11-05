import { act, render, screen } from '@testing-library/react';
import { Toast, TOAST_DURATION_MS } from './Toast';
import { showToast } from './toastStore';

describe('Toast', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should keep an empty polite live region mounted before any message', () => {
        render(<Toast />);
        const region = screen.getByRole('status');

        expect(region).toHaveAttribute('aria-live', 'polite');
        expect(region).toHaveTextContent('');
        expect(region).toHaveAttribute('data-visible', 'false');
    });

    it('should show a message and hide it after TOAST_DURATION_MS', () => {
        render(<Toast />);

        act(() => showToast('已加入收藏'));
        expect(screen.getByRole('status')).toHaveTextContent('已加入收藏');
        expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true');

        act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
        expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'false');
    });

    it('should restart the timer when a new message replaces the old one', () => {
        render(<Toast />);

        act(() => showToast('已加入收藏'));
        act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
        act(() => showToast('已移除收藏'));
        act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));

        expect(screen.getByRole('status')).toHaveTextContent('已移除收藏');
        expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true');
    });
});
