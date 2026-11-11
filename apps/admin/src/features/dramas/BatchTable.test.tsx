import { render, screen } from '@testing-library/react';
import { BatchTable } from './BatchTable';
import type { Strip } from './stripModel';

const strip: Strip = {
    past: [{ first: 1, last: 10, date: '2026-10-27' }],
    unreleased: false,
    future: [{ first: 11, last: 20, date: '2026-11-16' }],
    comparison: {
        released: [{ first: 1, last: 10, date: '2026-10-27' }],
        planned: [{ first: 1, last: 20, date: '2026-11-16' }],
        differs: true,
        changedEpisodes: [1],
    },
};

describe('BatchTable', () => {
    it('should be titled 上下架批次 and show day/month dates', () => {
        render(
            <BatchTable
                strip={strip}
                rule={{ kind: 'dates', batches: [{ from: 1, date: '2026-11-16' }] }}
            />,
        );
        expect(screen.getByText('上下架批次')).toBeInTheDocument();
        expect(screen.getByText('27/10 二')).toBeInTheDocument();
    });
});
