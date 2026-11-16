import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemInfoSheet } from './ItemInfoSheet';

const SHOW = {
    kind: 'show' as const,
    title: '公子會',
    airTime: '星期六（22:00 - 23:45）',
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
        expect(within(dialog).getByText('星期六（22:00 - 23:45）')).toBeInTheDocument();
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
        // S-1018：短篇顯示名同劇集名一樣時 key 唔可以撞
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
});
