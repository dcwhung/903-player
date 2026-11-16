import { render } from '@testing-library/react';
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
