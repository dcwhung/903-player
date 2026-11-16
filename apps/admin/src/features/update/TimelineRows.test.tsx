import { summarizeChanges, type ChangeDocument, type ChangeItem } from '@903-player/catalog';
import { render, within } from '@testing-library/react';
import { Timeline } from './Timeline';
import { cardsIn, discOf, drama, fixToday, groupsOf, loaded, rowsIn } from './timelineTestKit';

fixToday();

describe('Timeline entry rows', () => {
    it('should put a drama edit and an arc edit in one card (real summarizeChanges, image changes)', () => {
        const arc = { id: 'love', name: '戀愛二分一', episodes: 30, tile: 'arcs/love/tile.webp' };
        const images = { 'disc.webp': 'old-disc.webp', 'arcs/love/tile.webp': 'old-tile.webp' };
        const prev: ChangeDocument = {
            shows: [],
            dramas: [{ ...drama([arc]), images }],
        };
        const next: ChangeDocument = {
            shows: [],
            dramas: [
                {
                    ...drama([arc]),
                    images: { 'disc.webp': 'new-disc.webp', 'arcs/love/tile.webp': 'new.webp' },
                },
            ],
        };
        const summary = summarizeChanges(prev, next, '2026-11-12');
        render(<Timeline groups={summary.timeline} entries={loaded(next)} />);
        const cards = cardsIn(groupsOf()[0]!);
        expect(cards).toHaveLength(1);
        expect(cards[0]!.querySelector('.tl-entry-title')).toHaveTextContent('蘭茜夫人劇場');
        expect(rowsIn(cards[0]!)).toEqual(['修改劇集碟面', '修改戀愛二分一橫圖']);
        expect(within(cards[0]!).getAllByText('修改')[0]).toHaveClass('tl-tag', 'edit');
        expect(within(cards[0]!).getByText('碟面')).toHaveClass('tl-chip');
    });

    it("should show the arc's own disc on arc rows, falling back to the drama disc", () => {
        const lancy = {
            kind: 'dramas',
            id: 'lancy',
            name: '蘭茜夫人劇場',
        } as const;
        const items: ChangeItem[] = [
            {
                kind: 'unlist',
                when: 'now',
                entry: lancy,
                arc: { id: 'own', name: 'A', label: 'A' },
                detail: {},
            },
            {
                kind: 'unlist',
                when: 'now',
                entry: lancy,
                arc: { id: 'bare', name: 'B', label: 'B' },
                detail: {},
            },
        ];
        const entries = loaded({
            shows: [],
            dramas: [
                {
                    ...drama([
                        { id: 'own', name: 'A', disc: 'arcs/own/disc.webp' },
                        { id: 'bare', name: 'B' },
                    ]),
                    images: { 'disc.webp': 'drama.webp', 'arcs/own/disc.webp': 'arc.webp' },
                },
            ],
        });
        render(<Timeline groups={[{ when: 'now', items }]} entries={entries} />);
        const card = cardsIn(groupsOf()[0]!)[0]!;
        expect(discOf(card.querySelector('.tl-entry-head .thumb'))).toContain('drama.webp');
        const [own, bare] = within(card).getAllByRole('listitem');
        expect(own).toHaveTextContent('下架A');
        expect(discOf(own!.querySelector('.thumb'))).toContain('arc.webp');
        expect(discOf(bare!.querySelector('.thumb'))).toContain('drama.webp');
        expect(within(own!).getByText('下架')).toHaveClass('tl-tag', 'off');
    });

    it('should give a new drama one 新劇 row with the episode total, and label show-level rows 節目', () => {
        const next: ChangeDocument = {
            shows: [
                { id: 'waves', definition: { name: '口水多過浪花', enabled: false }, images: {} },
            ],
            dramas: [
                drama([
                    { id: 'a', name: 'A', episodes: 12 },
                    { id: 'b', name: 'B', episodes: 8 },
                ]),
            ],
        };
        const prev: ChangeDocument = {
            shows: [{ id: 'waves', definition: { name: '口水多過浪花' }, images: {} }],
            dramas: [],
        };
        const summary = summarizeChanges(prev, next, '2026-11-12');
        render(<Timeline groups={summary.timeline} entries={loaded(next)} />);
        const [waves, lancy] = cardsIn(groupsOf()[0]!);
        expect(rowsIn(waves!)).toEqual(['下架節目']);
        expect(rowsIn(lancy!)).toEqual(['新劇全 20 集']);
        expect(within(lancy!).getByText('新劇')).toHaveClass('tl-tag', 'new');
    });
});
