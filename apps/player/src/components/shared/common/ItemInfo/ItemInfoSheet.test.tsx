import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { ItemInfoSheet } from './ItemInfoSheet';
import { INFO_OPENER_ATTR } from './useCloseOnOutsidePress';
import { SHEET_SLIDE_MS } from '../Sheet/sheetDrag';

const SHOW = {
    kind: 'show' as const,
    title: '公子會',
    airTime: '逢星期六（22:00 - 23:45）播放',
    hosts: ['主持甲', '主持乙'],
    summary: '節目簡介',
};

describe('ItemInfoSheet', () => {
    it('should render nothing when closed', () => {
        render(<ItemInfoSheet open={false} sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show the title, air time, host chips and summary when open', () => {
        render(<ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        const dialog = screen.getByRole('dialog', { name: '節目資料' });
        expect(within(dialog).getByRole('heading', { name: '公子會' })).toBeInTheDocument();
        expect(within(dialog).getByText('播放時間')).toBeInTheDocument();
        expect(within(dialog).getByText('逢星期六（22:00 - 23:45）播放')).toBeInTheDocument();
        const hosts = within(dialog).getByRole('list', { name: '主持' });
        expect(
            within(hosts)
                .getAllByRole('listitem')
                .map((li) => li.textContent),
        ).toEqual(['主持甲', '主持乙']);
        expect(within(dialog).getByText('節目簡介')).toBeInTheDocument();
    });

    it('should leave out what a section does not have', () => {
        render(
            <ItemInfoSheet
                open
                sections={[{ kind: 'show', title: '公子會', summary: '節目簡介' }]}
                label="節目資料"
                onClose={vi.fn()}
            />,
        );
        expect(screen.queryByText('播放時間')).not.toBeInTheDocument();
        expect(screen.queryByText('主持')).not.toBeInTheDocument();
        expect(screen.queryByText('未有資料')).not.toBeInTheDocument();
    });

    it('should show the drama part then the arc part with cast chips', () => {
        render(
            <ItemInfoSheet
                open
                sections={[
                    { kind: 'drama', title: '蘭茜夫人劇場', summary: '劇集簡介' },
                    { kind: 'arc', title: '戀愛二分一', cast: ['聲演甲'], summary: '短篇簡介' },
                ]}
                label="劇集資料"
                onClose={vi.fn()}
            />,
        );
        const headings = screen.getAllByRole('heading').map((h) => h.textContent);
        expect(headings).toEqual(['蘭茜夫人劇場', '戀愛二分一']);
        expect(screen.getByRole('list', { name: '聲演' })).toHaveTextContent('聲演甲');
    });

    it('should mark each part with its kind so the arc title can be smaller', () => {
        // V4：短篇標題細過劇集名（ItemInfoSheet.module.css 按 data-kind 揀字大細）
        render(
            <ItemInfoSheet
                open
                sections={[
                    { kind: 'drama', title: '蘭茜夫人劇場', summary: '劇集簡介' },
                    { kind: 'arc', title: '初戀無限次', summary: '短篇簡介' },
                ]}
                label="劇集資料"
                onClose={vi.fn()}
            />,
        );
        const kindOf = (name: string) =>
            screen.getByRole('heading', { name }).closest('section')?.dataset.kind;
        expect(kindOf('蘭茜夫人劇場')).toBe('drama');
        expect(kindOf('初戀無限次')).toBe('arc');
    });

    it('should render both parts without a key clash when the arc is named like the drama', () => {
        // S-1057：短篇顯示名同劇集名一樣時 key 唔可以撞
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        render(
            <ItemInfoSheet
                open
                sections={[
                    { kind: 'drama', title: '同名', summary: '劇集簡介' },
                    { kind: 'arc', title: '同名', summary: '短篇簡介' },
                ]}
                label="劇集資料"
                onClose={vi.fn()}
            />,
        );
        expect(screen.getAllByRole('heading', { name: '同名' })).toHaveLength(2);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('should not make the chips pressable', () => {
        render(<ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
            '關閉',
        ]);
    });

    it('should close from the close button, the backdrop and Escape', async () => {
        const onClose = vi.fn();
        render(<ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={onClose} />);
        await userEvent.click(screen.getByRole('button', { name: '關閉' }));
        await userEvent.click(screen.getByTestId('info-sheet-backdrop'));
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('should keep focus on the close button when re-rendered with a new onClose', () => {
        // W-747：播放時每秒 re-render，caller 每次傳新 close function，焦點唔可以被扯返去 sheet
        const { rerender } = render(
            <ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={() => undefined} />,
        );
        const close = screen.getByRole('button', { name: '關閉' });
        close.focus();
        rerender(
            <ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={() => undefined} />,
        );
        expect(document.activeElement).toBe(close);
    });

    it('should call the latest onClose on Escape', async () => {
        const first = vi.fn();
        const latest = vi.fn();
        const { rerender } = render(
            <ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={first} />,
        );
        rerender(<ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={latest} />);
        await userEvent.keyboard('{Escape}');
        expect(first).not.toHaveBeenCalled();
        expect(latest).toHaveBeenCalledTimes(1);
    });

    it('should have no backdrop and not be modal when docked', () => {
        render(<ItemInfoSheet open docked sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        expect(screen.queryByTestId('info-sheet-backdrop')).not.toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
    });

    describe('docked: pressing something in the left column', () => {
        /** 橫版：左欄清單 + 右欄 ⓘ + 右欄 sheet */
        const renderDocked = (docked = true) => {
            const onClose = vi.fn();
            render(
                <>
                    <ul>
                        <li>
                            <button type="button">播放 17/10 星期六</button>
                            <span>17/10</span>
                        </li>
                        <li>
                            <a href="#all">全集</a>
                            <div role="button" tabIndex={0}>
                                戀愛二分一
                            </div>
                        </li>
                    </ul>
                    <button type="button" aria-label="節目資料" {...{ [INFO_OPENER_ATTR]: '' }}>
                        <svg data-testid="info-icon" />
                    </button>
                    <ItemInfoSheet
                        open
                        docked={docked}
                        sections={[SHOW]}
                        label="節目資料"
                        onClose={onClose}
                    />
                </>,
            );
            return onClose;
        };

        it('should close when a button, link or role=button outside the sheet is pressed', () => {
            const onClose = renderDocked();
            fireEvent.pointerDown(screen.getByRole('button', { name: '播放 17/10 星期六' }));
            fireEvent.pointerDown(screen.getByRole('link', { name: '全集' }));
            fireEvent.pointerDown(screen.getByRole('button', { name: '戀愛二分一' }));
            expect(onClose).toHaveBeenCalledTimes(3);
        });

        it('should not close when the info button or its icon is pressed', () => {
            const onClose = renderDocked();
            fireEvent.pointerDown(screen.getByRole('button', { name: '節目資料' }));
            fireEvent.pointerDown(screen.getByTestId('info-icon'));
            expect(onClose).not.toHaveBeenCalled();
        });

        it('should not close on plain text outside or on anything inside the sheet', () => {
            const onClose = renderDocked();
            fireEvent.pointerDown(screen.getByText('17/10'));
            fireEvent.pointerDown(screen.getByText('節目簡介'));
            fireEvent.pointerDown(screen.getByRole('dialog'));
            expect(onClose).not.toHaveBeenCalled();
        });

        it('should leave outside presses alone when not docked (the backdrop closes it)', () => {
            const onClose = renderDocked(false);
            fireEvent.pointerDown(screen.getByRole('button', { name: '播放 17/10 星期六' }));
            expect(onClose).not.toHaveBeenCalled();
        });

        it('should stop listening once closed', () => {
            const onClose = vi.fn();
            const { rerender } = render(
                <>
                    <button type="button">播放</button>
                    <ItemInfoSheet
                        open
                        docked
                        sections={[SHOW]}
                        label="節目資料"
                        onClose={onClose}
                    />
                </>,
            );
            rerender(
                <>
                    <button type="button">播放</button>
                    <ItemInfoSheet
                        open={false}
                        docked
                        sections={[SHOW]}
                        label="節目資料"
                        onClose={onClose}
                    />
                </>,
            );
            fireEvent.pointerDown(screen.getByRole('button', { name: '播放' }));
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('banner', () => {
        const banner = {
            kind: 'show' as const,
            art: 'tile.webp',
            title: '公子會',
            subtitle: '逢星期六（22:00 - 23:45）播放',
        };

        it('should put the tile, name and subtitle on the banner and drop the air time part', () => {
            render(
                <ItemInfoSheet
                    open
                    banner={banner}
                    sections={[SHOW]}
                    label="節目資料"
                    onClose={vi.fn()}
                />,
            );
            const dialog = screen.getByRole('dialog', { name: '節目資料' });
            const top = within(dialog).getByTestId('info-banner');
            expect(top.querySelector('img')).toHaveAttribute('src', 'tile.webp');
            expect(within(top).getByRole('heading', { name: '公子會' })).toBeInTheDocument();
            expect(within(top).getByText('逢星期六（22:00 - 23:45）播放')).toBeInTheDocument();
            expect(screen.getAllByRole('heading')).toHaveLength(1);
            expect(screen.queryByText('播放時間')).not.toBeInTheDocument();
            expect(within(dialog).getByText('節目簡介')).toBeInTheDocument();
        });

        it('should leave out a part that has nothing left once the banner takes its title and time', () => {
            // S-1019：節目淨有播放時間（已經做咗 banner 細字）就唔出空 <section>
            render(
                <ItemInfoSheet
                    open
                    banner={banner}
                    sections={[{ kind: 'show', title: '公子會', airTime: '逢星期六播放' }]}
                    label="節目資料"
                    onClose={vi.fn()}
                />,
            );
            expect(screen.getByRole('dialog').querySelector('section[data-kind]')).toBeNull();
        });

        it('should mark the grab bar and close button as sitting on the banner', () => {
            // S-1021：疊喺 banner 上嘅樣（白色 grab bar、✕ drop-shadow）兩個 sheet 共用
            render(
                <ItemInfoSheet
                    open
                    banner={banner}
                    sections={[SHOW]}
                    label="節目資料"
                    onClose={vi.fn()}
                />,
            );
            const dialog = screen.getByRole('dialog');
            expect(dialog.querySelectorAll('[data-on-banner]')).toHaveLength(2);
        });

        it('should keep the close button on top of the banner', () => {
            render(
                <ItemInfoSheet
                    open
                    banner={banner}
                    sections={[SHOW]}
                    label="節目資料"
                    onClose={vi.fn()}
                />,
            );
            expect(screen.getByRole('dialog')).toHaveAttribute('data-banner', 'true');
            expect(screen.getByRole('button', { name: '關閉' })).toBeInTheDocument();
        });

        it('should keep the arc title with its disc under a drama banner', () => {
            render(
                <ItemInfoSheet
                    open
                    banner={{ kind: 'drama', art: 'd.webp', title: '蘭茜夫人劇場' }}
                    sections={[
                        { kind: 'drama', title: '蘭茜夫人劇場', summary: '劇集簡介' },
                        { kind: 'arc', title: '初戀無限次', art: 'arc.webp', summary: '短篇簡介' },
                    ]}
                    label="劇集資料"
                    onClose={vi.fn()}
                />,
            );
            expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
                '蘭茜夫人劇場',
                '初戀無限次',
            ]);
            const arc = screen.getByRole('heading', { name: '初戀無限次' }).closest('section');
            expect(arc?.querySelector('img')).toHaveAttribute('src', 'arc.webp');
        });

        it('should drop the arc title and disc when the banner is the arc', () => {
            render(
                <ItemInfoSheet
                    open
                    banner={{
                        kind: 'arc',
                        art: 'arc-tile.webp',
                        title: '初戀無限次',
                        subtitle: '蘭茜夫人劇場',
                    }}
                    sections={[
                        { kind: 'arc', title: '初戀無限次', art: 'arc.webp', cast: ['聲演甲'] },
                    ]}
                    label="劇集資料"
                    onClose={vi.fn()}
                />,
            );
            expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
                '初戀無限次',
            ]);
            expect(screen.getByText('蘭茜夫人劇場')).toBeInTheDocument();
            expect(document.querySelector('img[src="arc.webp"]')).toBeNull();
            expect(screen.getByRole('list', { name: '聲演' })).toHaveTextContent('聲演甲');
        });

        it('should show the arc disc without a banner too', () => {
            render(
                <ItemInfoSheet
                    open
                    sections={[
                        { kind: 'arc', title: '初戀無限次', art: 'arc.webp', summary: '短' },
                    ]}
                    label="劇集資料"
                    onClose={vi.fn()}
                />,
            );
            expect(screen.queryByTestId('info-banner')).not.toBeInTheDocument();
            expect(document.querySelector('img[src="arc.webp"]')).not.toBeNull();
        });
    });
});

describe('ItemInfoSheet closing motion', () => {
    afterEach(() => {
        Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
    });

    it('should slide away still showing its content, then unmount (T6)', async () => {
        let finish: () => void = () => undefined;
        const finished = new Promise<void>((resolve) => {
            finish = resolve;
        });
        // jsdom 冇 Web Animations：扮收埋動畫跑緊
        Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
            configurable: true,
            value: () => [{ finished }],
        });
        const props = { label: '劇集資料', onClose: vi.fn() };
        const { rerender } = render(<ItemInfoSheet open sections={[SHOW]} {...props} />);
        // 短篇資料 sheet 閂嗰下父層清走 sections（useSeriesInfo）：滑走緊都要見返原本內容
        rerender(<ItemInfoSheet open={false} sections={[]} {...props} />);
        const overlay = document.querySelector('[data-info-sheet]');
        expect(overlay).toHaveAttribute('data-sheet-state', 'closing');
        expect(screen.getByRole('heading', { name: '公子會', hidden: true })).toBeInTheDocument();
        await act(async () => finish());
        expect(document.querySelector('[data-info-sheet]')).toBeNull();
    });

    it('should come back visible and pressable when reopened while sliding away after a pull (W-777)', () => {
        vi.useFakeTimers();
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            height: 400,
        } as DOMRect);
        // 收埋動畫一直未完：closing 期間同一粒 DOM 留住
        Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
            configurable: true,
            value: () => [{ finished: new Promise(() => undefined) }],
        });
        const Harness = () => {
            const [open, setOpen] = useState(true);
            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>
                        reopen
                    </button>
                    <ItemInfoSheet
                        open={open}
                        sections={[SHOW]}
                        label="節目資料"
                        onClose={() => setOpen(false)}
                    />
                </>
            );
        };
        render(<Harness />);
        const sheet = screen.getByRole('dialog');
        // handlers 掛喺表本身（清單以外隨時拉得）
        fireEvent.pointerDown(sheet, { clientY: 100, pointerId: 1, button: 0 });
        fireEvent.pointerMove(sheet, { clientY: 460, pointerId: 1 });
        fireEvent.pointerUp(sheet, { clientY: 460, pointerId: 1 });
        act(() => vi.advanceTimersByTime(SHEET_SLIDE_MS));
        const overlay = document.querySelector('[data-info-sheet]');
        expect(overlay).toHaveAttribute('data-sheet-state', 'closing');

        fireEvent.click(screen.getByRole('button', { name: 'reopen' }));

        expect(screen.getByRole('dialog')).toBe(sheet);
        expect(overlay).toHaveAttribute('data-sheet-state', 'open');
        expect(overlay).not.toHaveAttribute('inert');
        expect(sheet.style.transform).toBe('');
        expect(sheet).not.toHaveAttribute('data-closing');
        const backdrop = screen.getByTestId('info-sheet-backdrop');
        expect(backdrop.style.opacity).toBe('');
        expect(backdrop).not.toHaveAttribute('data-closing');
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should mark the overlay open so it slides up from the bottom', () => {
        render(<ItemInfoSheet open sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        expect(document.querySelector('[data-info-sheet]')).toHaveAttribute(
            'data-sheet-state',
            'open',
        );
    });
});
