import { summarizeChanges, type ChangeDocument } from '@903-player/catalog';
import { render, screen, within } from '@testing-library/react';
import { Timeline } from './Timeline';

const drama = (arcs: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        addedAt: '2026-10-01',
        arcs,
        ...extra,
    },
    images: {},
});

describe('Timeline', () => {
    it('should render summarizeChanges groups: 即時上線 first, then dated batches', () => {
        const prev: ChangeDocument = {
            shows: [],
            dramas: [drama([{ id: 'half', name: '戀愛二分一', episodes: 30 }])],
        };
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                drama([
                    { id: 'half', name: '戀愛二分一', episodes: 32 },
                    {
                        id: 'heart',
                        name: '我心不死',
                        episodes: 10,
                        addedAt: '2026-11-16',
                        episodeDates: { 6: '2026-11-18' },
                    },
                ]),
            ],
        };
        const summary = summarizeChanges(prev, next, '2026-11-10');
        render(<Timeline groups={summary.timeline} entries={[]} />);
        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('即時上線');
        expect(within(items[0]!).getByText('新集數')).toBeInTheDocument();
        expect(items[0]).toHaveTextContent('戀愛二分一31–32');
        expect(items[1]).toHaveTextContent('11/16 一');
        expect(items[1]).toHaveTextContent('新短篇');
        expect(items[1]).toHaveTextContent('我心不死');
    });
});
