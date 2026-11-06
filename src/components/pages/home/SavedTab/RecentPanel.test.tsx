/* 最近收聽（G，用戶決定）：兩欄時「左右左右」行先排；DOM / 讀屏次序 = 畫面次序（最新先） */
import { render, screen, within } from '@testing-library/react';
import { RecentPanel } from './RecentPanel';
import type { RecentRowView } from './savedTypes';

const recentRow = (no: number): RecentRowView => ({
    key: `/gongzi/${no}`,
    name: `節目 ${no}`,
    label: `第 ${no} 集`,
    spokenLabel: `第 ${no} 集`,
    art: '/disc.webp',
    track: { kind: 'series', dramaId: 'lancy', url: `/gongzi/${no}`, arc: '戀愛二分一', no },
    onOpen: vi.fn(),
});

// 最新排第一（recentListens 已經按 updatedAt 新到舊）
const ROWS = [1, 2, 3, 4, 5, 6, 7].map(recentRow);

const listOf = () => screen.getByRole('list');

describe('RecentPanel', () => {
    it('should mark a two-column list for the row-major grid instead of CSS columns', () => {
        render(<RecentPanel rows={ROWS} fill columns={2} />);

        expect(listOf()).toHaveAttribute('data-cols', '2');
        expect(listOf().style.columnCount).toBe('');
    });

    it('should keep one column by default (saved tab panel, phone)', () => {
        render(<RecentPanel rows={ROWS} />);

        expect(listOf()).toHaveAttribute('data-cols', '1');
    });

    it('should keep the newest-first order in the DOM so reading order matches left-right rows', () => {
        render(<RecentPanel rows={ROWS} fill columns={2} />);

        const names = within(listOf())
            .getAllByRole('listitem')
            .map((item) => item.textContent?.slice(0, 4));
        expect(names).toEqual(ROWS.map((r) => r.name));
    });
});
