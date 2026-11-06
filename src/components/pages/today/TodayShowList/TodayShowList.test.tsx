import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording } from '../../../../../tests/renderWithProviders';
import { hasBookmark } from '../../../../services/bookmarkStore';
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
    it('should put a bookmark star beside the play icon of shows that are up', async () => {
        const track = recording('sunnyday', '2026-10-19', '0600');
        const onSelect = vi.fn();
        const items = ITEMS.map((item, i) => (i === 0 ? { ...item, track } : item));
        render(<TodayShowList items={items} onSelect={onSelect} />);

        // C4：講埋節目名同讀屏日子
        const star = screen.getByRole('button', { name: '收藏 Bad Girl大過佬 19/10 星期一' });
        await userEvent.click(star);

        expect(star).toHaveAttribute('aria-pressed', 'true');
        expect(hasBookmark(track.url)).toBe(true);
        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getAllByRole('button', { name: /^收藏/ })).toHaveLength(1);
    });

    it('shows each show with its status', () => {
        render(<TodayShowList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getByRole('heading', { name: '節目表' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /暫停 Bad Girl大過佬/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        // ON AIR combo：時間後面接「播放中」紅 pill（唔再寫「 · 播放中」）
        expect(screen.getByText('10:09')).toBeInTheDocument();
        expect(screen.getByText('播放中')).toHaveAttribute('data-on-air-badge');
        expect(screen.getByText('07:08 · 已收聽')).toBeInTheDocument();
        expect(screen.getByText('08:09 · 未收聽')).toBeInTheDocument();
    });

    it('should mark the playing show with a live bar and a paused selected show with a grey bar', () => {
        const paused = ITEMS.map((item) =>
            item.status === 'playing' ? { ...item, status: 'unwatched' as const } : item,
        );
        const { rerender } = render(<TodayShowList items={ITEMS} onSelect={() => {}} />);
        const lamps = () =>
            [...document.querySelectorAll('[data-on-air-lamp]')].map((el) =>
                el.getAttribute('data-on-air-lamp'),
            );

        expect(lamps()).toEqual(['live']);

        rerender(<TodayShowList items={paused} onSelect={() => {}} />);

        expect(lamps()).toEqual(['idle']);
        expect(screen.queryByText('播放中')).not.toBeInTheDocument();
        expect(screen.getByText('10:09 · 未收聽')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^播放 Bad Girl大過佬/ }).className).toMatch(
            /active/,
        );
    });

    // S-730：連線中：「10:09 · 連線中…」、冇 pill、灰條，掣照係暫停
    it('should show 連線中… with a grey bar and no pill while connecting', () => {
        const connecting = ITEMS.map((item) =>
            item.status === 'playing' ? { ...item, status: 'connecting' as const } : item,
        );
        render(<TodayShowList items={connecting} onSelect={() => {}} />);

        expect(screen.getByText('10:09 · 連線中…')).toBeInTheDocument();
        expect(screen.queryByText('播放中')).not.toBeInTheDocument();
        expect(document.querySelector('[data-on-air-lamp]')).toHaveAttribute(
            'data-on-air-lamp',
            'idle',
        );
        expect(
            screen.getByRole('button', { name: /^暫停 Bad Girl大過佬，連線中…$/ }),
        ).toBeInTheDocument();
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

        /** 未上架嗰行：唔係掣，用可見文字搵 */
        const unavailableRow = (): HTMLElement => {
            const row = screen.getByText('口水多過浪花').closest('li');
            if (!row) throw new Error('unavailable row not found');
            return row;
        };

        it('lists them as plain rows, not buttons, without a play icon', () => {
            render(<TodayShowList items={withUnavailable} onSelect={() => {}} />);

            const row = unavailableRow();
            expect(row).toHaveTextContent('口水多過浪花15:10 · 未上架');
            expect(within(row).queryByRole('button')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /口水多過浪花/ })).not.toBeInTheDocument();
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

            await userEvent.click(unavailableRow());

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
