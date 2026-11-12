import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateField } from './DateField';

/** 今日 = 12/11/2026（四） */
const NOW = new Date('2026-11-12T04:00:00Z');

function Harness({
    initial,
    min,
    onChange,
}: {
    initial: string;
    min?: string;
    onChange?: (iso: string) => void;
}) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <DateField
                label="上架日期"
                value={value}
                required
                min={min}
                onChange={(iso) => {
                    setValue(iso);
                    onChange?.(iso);
                }}
            />
            <output>{value}</output>
            <button type="button">outside</button>
        </>
    );
}

const input = () => screen.getByRole('textbox', { name: '上架日期' });
const trigger = () => screen.getByRole('button', { name: '選擇上架日期' });

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('DateField', () => {
    it('should always show DD/MM/YYYY and keep ISO in and out', async () => {
        const onChange = vi.fn();
        render(<Harness initial="2026-11-05" onChange={onChange} />);
        expect(input()).toHaveValue('05/11/2026');
        await userEvent.clear(input());
        await userEvent.type(input(), '20/12/2026');
        expect(onChange).toHaveBeenLastCalledWith('2026-12-20');
        expect(screen.getByRole('status')).toHaveTextContent('2026-12-20');
    });

    it('should show an inline error for a date that does not exist, and not change the value', async () => {
        const onChange = vi.fn();
        render(<Harness initial="2026-11-05" onChange={onChange} />);
        await userEvent.clear(input());
        await userEvent.type(input(), '31/11/2026');
        fireEvent.blur(input());
        expect(input()).toHaveAttribute('aria-invalid', 'true');
        expect(input()).toHaveAccessibleDescription('日期無效，請以 DD/MM/YYYY 格式輸入');
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('2026-11-05');
    });

    it('should refuse a typed date before min', async () => {
        render(<Harness initial="2026-11-20" min="2026-11-13" />);
        await userEvent.clear(input());
        await userEvent.type(input(), '01/11/2026{Enter}');
        expect(input()).toHaveAccessibleDescription('日期不可早於 13/11/2026');
    });

    it('should open a month calendar from Sunday with today marked and the value selected', async () => {
        render(<Harness initial="2026-11-05" />);
        expect(trigger().querySelector('svg.lucide-calendar')).not.toBeNull();
        await userEvent.click(trigger());
        const dialog = screen.getByRole('dialog', { name: '選擇上架日期' });
        expect(dialog).toBeInTheDocument();
        expect(screen.getByRole('grid', { name: '2026 年 11 月' })).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
            '日',
            '一',
            '二',
            '三',
            '四',
            '五',
            '六',
        ]);
        const selected = screen.getByRole('gridcell', { selected: true });
        expect(selected).toHaveTextContent('5');
        expect(
            screen.getByRole('button', { name: /^12\/11\/2026 星期四（今日）$/ }),
        ).toHaveAttribute('aria-current', 'date');
        // 開咗就 focus 揀咗嗰日
        expect(screen.getByRole('button', { name: '05/11/2026 星期四' })).toHaveFocus();
    });

    it('should switch months with the icon buttons', async () => {
        render(<Harness initial="2026-11-05" />);
        await userEvent.click(trigger());
        await userEvent.click(screen.getByRole('button', { name: '下一個月' }));
        expect(screen.getByRole('grid', { name: '2026 年 12 月' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '上一個月' }));
        await userEvent.click(screen.getByRole('button', { name: '上一個月' }));
        expect(screen.getByRole('grid', { name: '2026 年 10 月' })).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: '上一個月' }).querySelector('svg.lucide'),
        ).not.toBeNull();
    });

    it('should move with arrows / PageUp / PageDown, pick with Enter and close', async () => {
        const onChange = vi.fn();
        render(<Harness initial="2026-11-05" onChange={onChange} />);
        await userEvent.click(trigger());
        await userEvent.keyboard('{ArrowRight}{ArrowDown}');
        expect(screen.getByRole('button', { name: '13/11/2026 星期五' })).toHaveFocus();
        await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
        expect(screen.getByRole('button', { name: '05/11/2026 星期四' })).toHaveFocus();
        await userEvent.keyboard('{PageDown}');
        expect(screen.getByRole('grid', { name: '2026 年 12 月' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '05/12/2026 星期六' })).toHaveFocus();
        await userEvent.keyboard('{PageUp}{PageUp}');
        expect(screen.getByRole('button', { name: '05/10/2026 星期一' })).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(onChange).toHaveBeenLastCalledWith('2026-10-05');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(input()).toHaveValue('05/10/2026');
        expect(trigger()).toHaveFocus();
    });

    it('should close on Escape and give focus back to the calendar button', async () => {
        const onChange = vi.fn();
        render(<Harness initial="2026-11-05" onChange={onChange} />);
        await userEvent.click(trigger());
        await userEvent.keyboard('{ArrowRight}{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(trigger()).toHaveFocus();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('should close on a click outside', async () => {
        render(<Harness initial="2026-11-05" />);
        await userEvent.click(trigger());
        await userEvent.click(screen.getByRole('button', { name: 'outside' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not pick days before min', async () => {
        const onChange = vi.fn();
        render(<Harness initial="2026-11-20" min="2026-11-13" onChange={onChange} />);
        await userEvent.click(trigger());
        const early = screen.getByRole('button', { name: '10/11/2026 星期二' });
        expect(early).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(early);
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should open above the field when there is no room below', async () => {
        render(<Harness initial="2026-11-05" />);
        const rect = (top: number, height: number) =>
            ({
                top,
                bottom: top + height,
                height,
                left: 0,
                right: 0,
                width: 0,
                x: 0,
                y: top,
            }) as DOMRect;
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
            this: HTMLElement,
        ) {
            return this.classList.contains('date-pop') ? rect(0, 300) : rect(700, 30);
        });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        await userEvent.click(trigger());
        expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'up');
        vi.restoreAllMocks();
    });
});
