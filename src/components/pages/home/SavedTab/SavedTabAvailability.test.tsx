/* 收藏 tab：已下架灰行（LB 已下架）、快將下架琥珀字（LB1 / LR1）（P8 #6，_mockups_/coming-soon ⑧） */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedTab } from './SavedTab';
import type { SavedRowView, SavedTabView } from './savedTypes';

const LEAVING = { text: '05/12 下架', label: '05/12（六）下架' };

const row = (extra: Partial<SavedRowView> = {}): SavedRowView => ({
    key: '/half/3',
    label: '第 3 集',
    status: '聽到 12:30 / 30:00',
    ratio: 0.4,
    playing: false,
    name: '蘭茜夫人劇場 戀愛二分一',
    zoomKey: 'episode:/half/3',
    onOpen: vi.fn(),
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    ...extra,
});

const view = (rows: SavedRowView[], recent: SavedTabView['recent'] = []): SavedTabView => ({
    layout: 'phone',
    columns: 1,
    solo: false,
    boxes: [
        {
            key: 'drama:lancy',
            kind: 'drama',
            title: '蘭茜夫人劇場',
            banner: '/banner.webp',
            sections: [{ key: 's', art: '/disc.webp', heading: '戀愛二分一', rows }],
        },
    ],
    recent,
});

describe('SavedTab availability', () => {
    it('should grey a removed episode: no play button, not openable, removable with Delete', async () => {
        const removed = row({ removed: true });
        render(<SavedTab view={view([removed])} />);

        const open = screen.getByRole('button', {
            name: '蘭茜夫人劇場 戀愛二分一 第 3 集，已下架，未可以收聽',
        });
        expect(open).toHaveAttribute('aria-disabled', 'true');
        expect(open).toHaveTextContent('已下架');
        expect(screen.queryByRole('button', { name: /^播放 / })).not.toBeInTheDocument();
        await userEvent.click(open);
        expect(removed.onOpen).not.toHaveBeenCalled();
        open.focus();
        await userEvent.keyboard('{Delete}');
        expect(removed.onRemove).toHaveBeenCalledTimes(1);
    });

    it('should add the amber leaving day to the status line (LB1)', () => {
        render(<SavedTab view={view([row({ leaving: LEAVING })])} />);

        const open = screen.getByRole('button', { name: /^開啟 蘭茜夫人劇場 戀愛二分一 第 3 集/ });
        expect(open).toHaveTextContent('聽到 12:30 / 30:00');
        expect(open).toHaveTextContent('05/12 下架');
        expect(open).toHaveAccessibleName(/05\/12（六）下架/);
    });

    it('should add a second amber line to a recent row leaving soon (LR1)', () => {
        const track = {
            kind: 'series',
            dramaId: 'lancy',
            url: '/half/3',
            arc: '戀愛二分一',
            no: 3,
        } as const;
        const recent = [
            {
                key: '/half/3',
                name: '蘭茜夫人劇場',
                label: '戀愛二分一 · 第 3 集',
                art: '/disc.webp',
                track,
                leaving: LEAVING,
                onOpen: vi.fn(),
            },
        ];
        render(<SavedTab view={view([], recent)} />);

        const open = screen.getByRole('button', {
            name: /^開啟 蘭茜夫人劇場 戀愛二分一 · 第 3 集/,
        });
        expect(open).toHaveTextContent('05/12 下架');
        expect(open).toHaveAccessibleName(/05\/12（六）下架/);
    });
});
