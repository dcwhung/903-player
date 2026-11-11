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
            />,
        );
        expect(screen.getByText('上下架批次')).toBeInTheDocument();
        const [, first, second] = screen.getAllByRole('row');
        const row1 = within(first as HTMLElement);
        expect(row1.getByText('7/12 一')).toBeInTheDocument();
        expect(row1.getByText('第 16–20 集')).toHaveClass('pill', 'info');
        expect(row1.getByText('—')).toBeInTheDocument();
        expect(within(second as HTMLElement).getByText('第 1–6 集')).toHaveClass('pill', 'bad');
    });
});
