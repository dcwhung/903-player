/*
 * 收藏 tab 播緊 / 暫停嗰行（ON AIR combo，用戶 2026-11-06）：播緊 =「播放中」紅 pill + 左邊紅條，
 * 日期 / 狀態用普通字色（唔再用主題色）；揀中但暫停 = 左邊灰條、照寫聽到邊；冇深色底框
 */
import { render, screen, within } from '@testing-library/react';
import { SavedTab } from './SavedTab';
import type { SavedRowView, SavedTabView } from './savedTypes';

const row = (extra: Partial<SavedRowView>): SavedRowView => ({
    key: '/chisee/1',
    label: '第 1 集',
    spokenLabel: '第 1 集',
    status: '播放中',
    ratio: 0.1,
    playing: true,
    current: true,
    onAir: true,
    name: '芝See菇Bi Family，三十六計',
    zoomKey: 'episode:/chisee/1',
    onOpen: vi.fn(),
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    ...extra,
});

const view = (rows: SavedRowView[]): SavedTabView => ({
    mode: 'saved',
    recentColumns: 1,
    layout: 'phone',
    columns: 1,
    solo: false,
    boxes: [
        {
            key: 'drama:chisee',
            kind: 'drama',
            title: '芝See菇Bi Family',
            banner: '/banner.webp',
            sections: [{ key: 's', art: '/disc.webp', heading: '三十六計', rows }],
        },
    ],
    recent: [],
});

const lampOf = (li: Element | null) =>
    li?.querySelector('[data-on-air-lamp]')?.getAttribute('data-on-air-lamp') ?? null;

describe('SavedTab playing row', () => {
    it('should show the on-air pill and live bar instead of the 播放中 text colour', () => {
        render(<SavedTab view={view([row({})])} />);
        const li = screen.getByText('第 1 集').closest('li');

        expect(li).toHaveAttribute('data-playing', 'true');
        expect(within(li as HTMLElement).getByText('播放中')).toHaveAttribute('data-on-air-badge');
        expect(lampOf(li)).toBe('live');
        expect(li?.getAttribute('style')).toBeNull();
        // 讀屏照由行掣講一次「播放中」
        expect(
            within(li as HTMLElement).getByRole('button', { name: /^開啟 .*，播放中$/ }),
        ).toBeInTheDocument();
    });

    it('should mark a paused current row with a grey bar and keep its status text', () => {
        render(
            <SavedTab
                view={view([row({ playing: false, onAir: false, status: '聽到 0:06 / 10:00' })])}
            />,
        );
        const li = screen.getByText('第 1 集').closest('li');

        expect(lampOf(li)).toBe('idle');
        expect(screen.queryByText('播放中')).not.toBeInTheDocument();
        expect(screen.getByText('聽到 0:06 / 10:00')).toBeInTheDocument();
    });

    // S-730：連線中（未知時長）同集數清單一樣：寫「連線中…」、冇 pill、灰條；掣照係 ⏸
    it('should show 連線中… with a grey bar and no pill while connecting', () => {
        render(<SavedTab view={view([row({ onAir: false, status: '連線中…' })])} />);
        const li = screen.getByText('第 1 集').closest('li');

        expect(screen.getByText('連線中…')).toBeInTheDocument();
        expect(screen.queryByText('播放中')).not.toBeInTheDocument();
        expect(lampOf(li)).toBe('idle');
        expect(
            within(li as HTMLElement).getByRole('button', { name: /^暫停/ }),
        ).toBeInTheDocument();
    });

    it('should leave other rows without a bar', () => {
        render(
            <SavedTab
                view={view([
                    row({ playing: false, current: false, onAir: false, status: '未收聽' }),
                ])}
            />,
        );

        expect(lampOf(screen.getByText('第 1 集').closest('li'))).toBeNull();
    });
});
