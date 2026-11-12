import { summarizeChanges, type ChangeDocument } from '@903-player/catalog';
import { render, screen, within } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
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
        expect(items[1]).toHaveTextContent('16/11 一');
        expect(items[1]).toHaveTextContent('新短篇');
        expect(items[1]).toHaveTextContent('我心不死');
    });

    it('should show a chevron on 查看全部 when the timeline is collapsed', () => {
        const dates = Object.fromEntries(
            [2, 3, 4, 5, 6, 7, 8].map((no) => [no, `2026-11-${10 + no}`]),
        );
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                drama([
                    {
                        id: 'heart',
                        name: '我心不死',
                        episodes: 8,
                        addedAt: '2026-11-11',
                        episodeDates: dates,
                    },
                ]),
            ],
        };
        const summary = summarizeChanges({ shows: [], dramas: [] }, next, '2026-11-10');
        render(<Timeline groups={summary.timeline} entries={[]} />);
        const all = screen.getByRole('button', { name: /查看全部/ });
        expect(hasIcon(all, 'chevron-down')).toBe(true);
    });
});
