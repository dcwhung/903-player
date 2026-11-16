import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemInfoSheet } from './ItemInfoSheet';

const SHOW = {
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
                sections={[{ title: '公子會', summary: '節目簡介' }]}
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
                    { title: '蘭茜夫人劇場', summary: '劇集簡介' },
                    { title: '戀愛二分一', cast: ['聲演甲'], summary: '短篇簡介' },
                ]}
                label="劇集資料"
                onClose={vi.fn()}
            />,
        );
        const headings = screen.getAllByRole('heading').map((h) => h.textContent);
        expect(headings).toEqual(['蘭茜夫人劇場', '戀愛二分一']);
        expect(screen.getByRole('list', { name: '聲演' })).toHaveTextContent('聲演甲');
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

    it('should have no backdrop and not be modal when docked', () => {
        render(<ItemInfoSheet open docked sections={[SHOW]} label="節目資料" onClose={vi.fn()} />);
        expect(screen.queryByTestId('info-sheet-backdrop')).not.toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
    });
});
