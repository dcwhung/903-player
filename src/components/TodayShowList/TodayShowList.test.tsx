import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayShowList, type TodayShowItem } from './TodayShowList';

const ITEMS: TodayShowItem[] = [
    {
        key: 'a',
        name: 'Bad Girl大過佬',
        time: '10:09',
        art: '/a.jpg',
        status: 'playing',
        active: true,
    },
    { key: 'b', name: '雲妮鍾情', time: '07:08', art: '/b.jpg', status: 'watched', active: false },
    {
        key: 'c',
        name: '在晴朗的一天出發',
        time: '08:09',
        art: '/c.jpg',
        status: 'unwatched',
        active: false,
    },
];

describe('TodayShowList', () => {
    it('shows each show with its status', () => {
        render(<TodayShowList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getByRole('heading', { name: '節目表' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /暫停 Bad Girl大過佬/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByText('10:09 · 播放中')).toBeInTheDocument();
        expect(screen.getByText('07:08 · 已收聽')).toBeInTheDocument();
        expect(screen.getByText('08:09 · 未收聽')).toBeInTheDocument();
    });

    it('shows a pause button only on the playing show', () => {
        const paused = ITEMS.map((item) =>
            item.status === 'playing' ? { ...item, status: 'unwatched' as const } : item,
        );
        const { rerender } = render(<TodayShowList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getAllByRole('button', { name: /^暫停/ })).toHaveLength(1);

        rerender(<TodayShowList items={paused} onSelect={() => {}} />);

        expect(screen.queryByRole('button', { name: /^暫停/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^播放 Bad Girl大過佬/ })).toBeInTheDocument();
    });

    describe('unavailable shows', () => {
        const UNAVAILABLE: TodayShowItem = {
            key: 'missing',
            name: '口水多過浪花',
            time: '15:10',
            art: '/d.jpg',
            status: 'unavailable',
            active: false,
        };
        const withUnavailable = [...ITEMS, UNAVAILABLE];

        it('lists them as disabled rows without a play icon', () => {
            render(<TodayShowList items={withUnavailable} onSelect={() => {}} />);

            const row = screen.getByRole('button', { name: '口水多過浪花，15:10 · 未上架' });
            expect(row).toBeDisabled();
            expect(row).toHaveTextContent('15:10 · 未上架');
            expect(row.querySelector('svg')).toBeNull();
        });

        it('says how many are unavailable next to the heading', () => {
            render(<TodayShowList items={withUnavailable} onSelect={() => {}} />);

            expect(screen.getByText('1 個未上架')).toBeInTheDocument();
        });

        it('shows no count when everything is available', () => {
            render(<TodayShowList items={ITEMS} onSelect={() => {}} />);

            expect(screen.queryByText(/未上架/)).not.toBeInTheDocument();
        });

        it('does not report a tap on an unavailable show', async () => {
            const onSelect = vi.fn();
            render(<TodayShowList items={withUnavailable} onSelect={onSelect} />);

            await userEvent.click(screen.getByRole('button', { name: /口水多過浪花/ }));

            expect(onSelect).not.toHaveBeenCalled();
        });
    });

    it('reports the selected show', async () => {
        const onSelect = vi.fn();
        render(<TodayShowList items={ITEMS} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: /播放 雲妮鍾情/ }));

        expect(onSelect).toHaveBeenCalledWith('b');
    });
});
