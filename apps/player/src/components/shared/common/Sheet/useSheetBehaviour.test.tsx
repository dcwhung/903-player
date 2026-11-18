import { fireEvent, render, screen, within } from '@testing-library/react';
import { useSheetBehaviour } from './useSheetBehaviour';

const Sheet = ({ open }: { open: boolean }) => {
    const { setSheet } = useSheetBehaviour(open, vi.fn());
    return open ? <section ref={setSheet} role="dialog" tabIndex={-1} /> : null;
};

const Host = ({ open }: { open: boolean }) => (
    <>
        <button type="button">ⓘ</button>
        <Sheet open={open} />
    </>
);

/*
 * 表一開就由畫面底下面滑上嚟（SheetMotion sheet-in translateY(100%)）：focus 嗰刻佢仲喺畫面外，
 * 預設 focus() 會捲祖先（連 overflow: hidden 嘅 html / main）去露出佢，iOS 打橫成頁彈上彈落。
 * 開同閂（焦點返去 ⓘ）都唔可以捲
 */
describe('useSheetBehaviour focus', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should focus the sheet without scrolling when it opens', () => {
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');
        render(<Sheet open />);
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
        expect(focus.mock.calls.every(([options]) => options?.preventScroll === true)).toBe(true);
    });

    it('should return focus to the opener without scrolling when it closes', () => {
        const { rerender, getByRole } = render(<Host open={false} />);
        const opener = getByRole('button');
        opener.focus();
        rerender(<Host open />);
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');
        rerender(<Host open={false} />);
        expect(opener).toHaveFocus();
        expect(focus.mock.instances).toContain(opener);
        expect(focus.mock.calls.every(([options]) => options?.preventScroll === true)).toBe(true);
    });
});

const TrapSheet = ({
    open,
    modal = true,
    rows = 2,
}: {
    open: boolean;
    modal?: boolean;
    rows?: number;
}) => {
    const { setSheet } = useSheetBehaviour(open, vi.fn());
    return (
        <>
            <button type="button">behind</button>
            {open && (
                <section ref={setSheet} role="dialog" aria-modal={modal} tabIndex={-1}>
                    <button type="button">close</button>
                    {Array.from({ length: rows }, (_, i) => (
                        <button key={i} type="button">{`row ${i}`}</button>
                    ))}
                    <button type="button" disabled>
                        disabled
                    </button>
                    <button type="button" tabIndex={-1}>
                        skipped
                    </button>
                </section>
            )}
        </>
    );
};

/** 由 target 撳 Tab（jsdom 唔會自己郁焦點）；返 true = 冇 preventDefault，交返瀏覽器行 */
const tab = (target: Element, shiftKey = false) =>
    fireEvent.keyDown(target, { key: 'Tab', shiftKey });

/*
 * aria-modal 嘅表：Tab / Shift+Tab 唔可以行出表外（Code Review 2026-11-18 p10-lane6）。
 * 最尾 ↔ 最頭循環；焦點走咗出去就拉返入嚟；可聚焦元素喺撳鍵嗰刻先計（清單 lazy render）
 */
describe('useSheetBehaviour focus trap', () => {
    it('should wrap Tab from the last focusable to the first', () => {
        render(<TrapSheet open />);
        const last = screen.getByRole('button', { name: 'row 1' });
        last.focus();
        expect(tab(last)).toBe(false);
        expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();
    });

    it('should wrap Shift+Tab from the first focusable to the last', () => {
        render(<TrapSheet open />);
        const first = screen.getByRole('button', { name: 'close' });
        first.focus();
        expect(tab(first, true)).toBe(false);
        expect(screen.getByRole('button', { name: 'row 1' })).toHaveFocus();
    });

    it('should send Shift+Tab from the sheet itself to the last focusable', () => {
        render(<TrapSheet open />);
        expect(screen.getByRole('dialog')).toHaveFocus();
        expect(tab(screen.getByRole('dialog'), true)).toBe(false);
        expect(screen.getByRole('button', { name: 'row 1' })).toHaveFocus();
    });

    it('should leave Tab between inner focusables to the browser', () => {
        render(<TrapSheet open />);
        const middle = screen.getByRole('button', { name: 'row 0' });
        middle.focus();
        expect(tab(middle)).toBe(true);
        expect(tab(middle, true)).toBe(true);
    });

    it('should bring focus back into the sheet when it escaped', () => {
        render(<TrapSheet open />);
        const behind = screen.getByRole('button', { name: 'behind' });
        behind.focus();
        expect(tab(behind)).toBe(false);
        expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();
        behind.focus();
        expect(tab(behind, true)).toBe(false);
        expect(screen.getByRole('button', { name: 'row 1' })).toHaveFocus();
    });

    it('should count focusables rendered after opening', () => {
        const { rerender } = render(<TrapSheet open rows={1} />);
        rerender(<TrapSheet open rows={3} />);
        const last = screen.getByRole('button', { name: 'row 2' });
        last.focus();
        expect(tab(last)).toBe(false);
        expect(screen.getByRole('button', { name: 'close' })).toHaveFocus();
    });

    it('should not trap Tab when the sheet is closed', () => {
        render(<TrapSheet open={false} />);
        const behind = screen.getByRole('button', { name: 'behind' });
        behind.focus();
        expect(tab(behind)).toBe(true);
        expect(behind).toHaveFocus();
    });

    /*
     * S-1141（sheetFocusTrap isInOtherModal）：兩張 aria-modal 表同時開，兩個 keydown listener 都掛住。
     * 焦點喺邊張就由嗰張處理，另一張唔可以當「走咗出去」搶返入自己度。
     * 用先掛 listener 嗰張（第一張）：第二張嘅 listener 喺之後跑，冇分支就會將焦點扯過去
     */
    it('should leave Tab to the other open modal sheet that holds focus', () => {
        render(
            <>
                <TrapSheet open />
                <TrapSheet open />
            </>,
        );
        const [owner, other] = screen.getAllByRole('dialog');
        if (!owner || !other) throw new Error('expected two sheets');
        const middle = within(owner).getByRole('button', { name: 'row 0' });
        middle.focus();
        expect(tab(middle)).toBe(true);
        expect(middle).toHaveFocus();
        const last = within(owner).getByRole('button', { name: 'row 1' });
        last.focus();
        expect(tab(last)).toBe(false);
        expect(within(owner).getByRole('button', { name: 'close' })).toHaveFocus();
        expect(tab(last, true)).toBe(false);
        expect(within(owner).getByRole('button', { name: 'row 1' })).toHaveFocus();
    });

    it('should not trap Tab when the sheet is docked (not aria-modal)', () => {
        render(<TrapSheet open modal={false} />);
        const last = screen.getByRole('button', { name: 'row 1' });
        last.focus();
        expect(tab(last)).toBe(true);
        expect(last).toHaveFocus();
    });
});
