import { act, render, screen } from '@testing-library/react';
import { SHEET_EXIT_FALLBACK_MS, useSheetPresence } from './useSheetPresence';

/** 用 hook 嘅最細 sheet：overlay（掛 presence ref）入面一張表 */
const Probe = ({ open }: { open: boolean }) => {
    const { mounted, state, inert, overlayRef } = useSheetPresence(open);
    if (!mounted) return null;
    return (
        <div ref={overlayRef} data-testid="overlay" data-sheet-state={state} inert={inert}>
            <section data-testid="sheet" />
        </div>
    );
};

/** jsdom 冇 Web Animations：人手畀 overlay 嘅子元素一個跑緊嘅動畫 */
const stubAnimations = (finished: Promise<unknown>) => {
    const getAnimations = vi.fn(() => [{ finished } as unknown as Animation]);
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
        configurable: true,
        value: getAnimations,
    });
    return getAnimations;
};

const stubReducedMotion = (reduce: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
    );

const deferred = () => {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('useSheetPresence', () => {
    it('should render nothing while closed from the start', () => {
        render(<Probe open={false} />);
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('should mark the overlay as open while open', () => {
        render(<Probe open />);
        expect(screen.getByTestId('overlay')).toHaveAttribute('data-sheet-state', 'open');
        expect(screen.getByTestId('overlay')).not.toHaveAttribute('inert');
    });

    it('should unmount at once when closing has no animation to wait for', () => {
        const { rerender } = render(<Probe open />);
        rerender(<Probe open={false} />);
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('should stay as closing until the slide-down animation finishes', async () => {
        const slide = deferred();
        stubAnimations(slide.promise);
        const { rerender } = render(<Probe open />);
        rerender(<Probe open={false} />);
        expect(screen.getByTestId('overlay')).toHaveAttribute('data-sheet-state', 'closing');
        // 滑走緊唔收 tap / 焦點
        expect(screen.getByTestId('overlay')).toHaveAttribute('inert');
        await act(async () => slide.resolve());
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('should not get stuck when the animation never reports finished', () => {
        vi.useFakeTimers();
        stubAnimations(new Promise(() => undefined));
        const { rerender } = render(<Probe open />);
        rerender(<Probe open={false} />);
        act(() => vi.advanceTimersByTime(SHEET_EXIT_FALLBACK_MS));
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('should switch off instantly under reduced motion, without waiting for animations', () => {
        stubReducedMotion(true);
        const getAnimations = stubAnimations(new Promise(() => undefined));
        const { rerender } = render(<Probe open />);
        rerender(<Probe open={false} />);
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
        expect(getAnimations).not.toHaveBeenCalled();
    });

    it('should ask about reduced motion when closing starts, not when it opened', () => {
        stubReducedMotion(false);
        stubAnimations(new Promise(() => undefined));
        const { rerender } = render(<Probe open />);
        // 開咗之後先轉做減少動態：閂嗰刻要跟新設定
        stubReducedMotion(true);
        rerender(<Probe open={false} />);
        expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
    });

    it('should go back to open when reopened mid-close and ignore the stale finish', async () => {
        const slide = deferred();
        stubAnimations(slide.promise);
        const { rerender } = render(<Probe open />);
        rerender(<Probe open={false} />);
        rerender(<Probe open />);
        await act(async () => slide.resolve());
        expect(screen.getByTestId('overlay')).toHaveAttribute('data-sheet-state', 'open');
    });
});
