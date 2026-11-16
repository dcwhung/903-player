import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayShowList, type TodayShowItem } from './TodayShowList';

const INFO = { airTime: '星期一至五（06:00 - 10:00）', hosts: ['主持甲'], summary: '節目示範簡介' };

const ITEMS: TodayShowItem[] = [
    {
        key: 'a',
        name: '在晴朗的一天出發',
        time: '06:00',
        art: '/a.jpg',
        status: 'playing',
        active: true,
        info: INFO,
    },
    {
        key: 'b',
        name: 'Bad Girl大過佬',
        time: '10:00',
        art: '/b.jpg',
        status: 'unwatched',
        active: false,
    },
    {
        key: 'c',
        name: '口水多過浪花',
        time: '15:00',
        art: '/c.jpg',
        status: 'unavailable',
        active: false,
        info: { summary: '未上架示範簡介' },
    },
];

const renderList = (props: Partial<Parameters<typeof TodayShowList>[0]> = {}) =>
    render(<TodayShowList items={ITEMS} onSelect={vi.fn()} {...props} />);

describe('TodayShowList item info（P9.5 #12）', () => {
    it('should have no chevron when no show has info', () => {
        renderList({
            items: ITEMS.map(({ info: _info, ...item }) => item),
            infoExpanded: false,
            onToggleInfo: vi.fn(),
        });
        expect(screen.queryByRole('button', { name: '節目資料' })).not.toBeInTheDocument();
    });

    it('should put a chevron beside 節目表 that toggles the info', async () => {
        const onToggleInfo = vi.fn();
        renderList({ infoExpanded: false, onToggleInfo });
        const toggle = screen.getByRole('button', { name: '節目資料' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(toggle);
        expect(onToggleInfo).toHaveBeenCalledTimes(1);
    });

    it('should keep the info out of reach while collapsed', () => {
        renderList({ infoExpanded: false, onToggleInfo: vi.fn() });
        expect(screen.queryByRole('list', { name: '主持' })).not.toBeInTheDocument();
    });

    it('should show air time, host chips and summary under each row with info when expanded', () => {
        renderList({ infoExpanded: true, onToggleInfo: vi.fn() });
        const row = screen.getByRole('list', { name: '主持' }).closest('li[data-today-row]');
        expect(row).not.toBeNull();
        const scope = within(row as HTMLElement);
        expect(scope.getByText('星期一至五（06:00 - 10:00）')).toBeInTheDocument();
        expect(scope.getByText('節目示範簡介')).toBeInTheDocument();
        expect(scope.getByRole('button', { name: /^暫停 在晴朗的一天出發/ })).toBeInTheDocument();
    });

    it('should mark the schedule list apart from the host chip lists', () => {
        // S-1017：e2e 用 data-role 揀主清單，展開有主持 chip（都係 <ul>）都唔會撞
        const { container } = renderList({ infoExpanded: true, onToggleInfo: vi.fn() });
        const lists = container.querySelectorAll('[data-role="today-list"]');
        expect(lists).toHaveLength(1);
        expect(lists[0]?.querySelectorAll(':scope > li[data-today-row]')).toHaveLength(
            ITEMS.length,
        );
    });

    it('should show the info of a show that is not up yet', () => {
        renderList({ infoExpanded: true, onToggleInfo: vi.fn() });
        expect(screen.getByText('未上架示範簡介')).toBeInTheDocument();
    });

    it('should mark the expanded rows so the lamp and buttons sit at the top', () => {
        const { container } = renderList({ infoExpanded: true, onToggleInfo: vi.fn() });
        const rows = [...container.querySelectorAll('li[data-today-row]')];
        expect(rows.map((row) => row.getAttribute('data-expanded'))).toEqual([
            'true',
            'false',
            'true',
        ]);
    });
});
