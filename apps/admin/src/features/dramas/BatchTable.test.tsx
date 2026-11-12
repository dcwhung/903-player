import { render, screen, within } from '@testing-library/react';
import { BatchTable } from './BatchTable';

describe('BatchTable', () => {
    it('should list each day with the episodes listed and unlisted as pills (mockup ⑨)', () => {
        render(
            <BatchTable
                days={[
                    {
                        date: '2026-12-07',
                        listings: [{ first: 16, last: 20, date: '2026-12-07' }],
                        removals: [],
                    },
                    {
                        date: '2026-12-14',
                        listings: [{ first: 21, last: 25, date: '2026-12-14' }],
                        removals: [{ first: 1, last: 6, date: '2026-12-14' }],
                    },
                ]}
                today="2026-12-01"
            />,
        );
        // 同內容頁列表一樣嘅中性表，唔係黃色 note 卡；標題搬咗去預覽頂（用戶 2026-11-12）
        expect(screen.getByRole('table').closest('.note')).toBeNull();
        expect(screen.queryByText('上下架批次')).not.toBeInTheDocument();
        const [, todayRow, first, second] = screen.getAllByRole('row');
        expect(todayRow).toHaveClass('today');
        expect(within(todayRow as HTMLElement).getByText('1/12 二（今日）')).toBeInTheDocument();
        expect(within(todayRow as HTMLElement).getAllByText('—')).toHaveLength(2);
        const row1 = within(first as HTMLElement);
        expect(row1.getByText('7/12 一')).toBeInTheDocument();
        expect(row1.getByText('第 16–20 集')).toHaveClass('pill', 'info');
        expect(row1.getByText('—')).toBeInTheDocument();
        expect(within(second as HTMLElement).getByText('第 1–6 集')).toHaveClass('pill', 'bad');
    });

    it('should highlight the batch row of today instead of adding one', () => {
        render(
            <BatchTable
                days={[
                    {
                        date: '2026-12-07',
                        listings: [{ first: 16, last: 20, date: '2026-12-07' }],
                        removals: [],
                    },
                ]}
                today="2026-12-07"
            />,
        );
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(2);
        expect(rows[1]).toHaveClass('today');
        expect(within(rows[1] as HTMLElement).getByText('7/12 一（今日）')).toBeInTheDocument();
    });
});
