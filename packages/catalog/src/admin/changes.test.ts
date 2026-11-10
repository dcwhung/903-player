import type { CatalogEntry } from '../document/document';
import { summarizeChanges } from './changes';
import type { ChangeDocument } from './changeTypes';

const TODAY = '2026-11-10';

type Json = Record<string, unknown>;

const show = (id: string, patch: Json = {}): CatalogEntry => ({
    id,
    definition: { name: `節目${id}`, fileTime: '1000', airDays: [1], ...patch },
    images: { 'tile.webp': 'https://x/t.webp' },
});

const series = (id: string, arcs: Json[], patch: Json = {}): CatalogEntry => ({
    id,
    definition: { name: `劇${id}`, kind: 'series', enabled: true, arcs, ...patch },
    images: { 'tile.webp': 'https://x/t.webp' },
});

const daily = (id: string, dates: string[]): CatalogEntry => ({
    id,
    definition: {
        name: `每日${id}`,
        kind: 'daily',
        enabled: true,
        episodes: dates.map((date) => ({ date })),
    },
    images: {},
});

const doc = (shows: CatalogEntry[], dramas: CatalogEntry[]): ChangeDocument => ({ shows, dramas });

const ARC1 = { id: 's1', name: 'Season 1', episodes: 3 };

const kinds = (prev: ChangeDocument | null, next: ChangeDocument) =>
    summarizeChanges(prev, next, TODAY).items.map(
        (i) => `${i.kind}:${i.entry?.id ?? ''}${i.arc ? `/${i.arc.id}` : ''}@${i.when}`,
    );

describe('summarizeChanges', () => {
    it('should find nothing when the documents match', () => {
        const d = doc([show('a')], [series('g', [ARC1])]);
        expect(summarizeChanges(d, JSON.parse(JSON.stringify(d)) as ChangeDocument, TODAY)).toEqual(
            { items: [], timeline: [] },
        );
    });

    it('should treat everything listed as new on the first publish', () => {
        expect(kinds(null, doc([show('a')], [series('g', [ARC1])]))).toEqual([
            'newShow:a@now',
            'newDrama:g@now',
            'newArc:g/s1@now',
        ]);
    });

    it('should date a new drama and its arcs by addedAt when in the future', () => {
        const next = doc([], [series('g', [ARC1], { addedAt: '2026-12-01' })]);
        const { items, timeline } = summarizeChanges(doc([], []), next, TODAY);
        expect(items.map((i) => i.when)).toEqual(['2026-12-01', '2026-12-01']);
        expect(items[1]?.detail).toEqual({ episodes: { first: 1, last: 3 } });
        expect(timeline).toEqual([{ when: '2026-12-01', items }]);
    });

    it('should report a new arc with its label and later batches as new episodes', () => {
        const arc2 = {
            id: 's2',
            name: 'Season 2',
            displayName: '第二季',
            episodes: 4,
            addedAt: '2026-11-08',
            episodeDates: { '3': '2026-11-20' },
        };
        const { items, timeline } = summarizeChanges(
            doc([], [series('g', [ARC1])]),
            doc([], [series('g', [ARC1, arc2])]),
            TODAY,
        );
        expect(items).toEqual([
            {
                kind: 'newArc',
                when: 'now',
                entry: { kind: 'dramas', id: 'g', name: '劇g' },
                arc: { id: 's2', name: 'Season 2', label: '第二季' },
                detail: { episodes: { first: 1, last: 2 } },
            },
            expect.objectContaining({
                kind: 'newEpisodes',
                when: '2026-11-20',
                detail: { episodes: { first: 3, last: 4 } },
            }),
        ]);
        expect(timeline.map((g) => g.when)).toEqual(['now', '2026-11-20']);
    });

    it('should not report a disabled new arc, and report re-enabling as a new arc', () => {
        const hidden = { ...ARC1, id: 's2', name: 'S2', enabled: false };
        expect(
            kinds(doc([], [series('g', [ARC1])]), doc([], [series('g', [ARC1, hidden])])),
        ).toEqual([]);
        const shown = { ...hidden, enabled: true };
        expect(
            kinds(doc([], [series('g', [ARC1, hidden])]), doc([], [series('g', [ARC1, shown])])),
        ).toEqual(['newArc:g/s2@now']);
    });

    it('should report added episodes of an existing arc', () => {
        const items = summarizeChanges(
            doc([], [series('g', [ARC1])]),
            doc([], [series('g', [{ ...ARC1, episodes: 5 }])]),
            TODAY,
        ).items;
        expect(items.map((i) => [i.kind, i.detail])).toEqual([
            ['newEpisodes', { episodes: { first: 4, last: 5 } }],
        ]);
    });

    it('should report unlisting a show, a drama, an arc and a deleted entry', () => {
        const prev = doc(
            [show('a'), show('b')],
            [series('g', [ARC1, { ...ARC1, id: 's2', name: 'S2' }]), series('h', [ARC1])],
        );
        const next = doc(
            [show('a', { enabled: false })],
            [
                series('g', [ARC1, { ...ARC1, id: 's2', name: 'S2', enabled: false }]),
                series('h', [ARC1], { enabled: false }),
            ],
        );
        const items = summarizeChanges(prev, next, TODAY).items;
        expect(
            items.map(
                (i) => `${i.kind}:${i.entry?.id}${i.arc ? `/${i.arc.id}` : ''}:${i.detail.reason}`,
            ),
        ).toEqual([
            'unlist:a:disabled',
            'unlist:b:deleted',
            'unlist:g/s2:disabled',
            'unlist:h:disabled',
        ]);
    });

    it('should schedule a removal date as an unlist on that day', () => {
        const items = summarizeChanges(
            doc([], [series('g', [ARC1])]),
            doc(
                [],
                [series('g', [{ ...ARC1, removedAt: '2026-12-31' }], { removedAt: '2027-01-31' })],
            ),
            TODAY,
        ).items;
        expect(
            items.map((i) => `${i.kind}:${i.arc?.id ?? '-'}@${i.when}:${i.detail.reason}`),
        ).toEqual(['unlist:-@2027-01-31:removedAt', 'unlist:s1@2026-12-31:removedAt']);
    });

    it('should list edited fields of shows, dramas and arcs', () => {
        const prev = doc([show('a')], [series('g', [ARC1])]);
        const next = doc(
            [{ ...show('a', { summary: '新簡介' }), images: { 'tile.webp': 'https://x/n.webp' } }],
            [
                series('g', [{ ...ARC1, displayName: '第一季', titles: { '1': '集名' } }], {
                    name: '新名',
                }),
            ],
        );
        const items = summarizeChanges(prev, next, TODAY).items;
        expect(items.map((i) => [i.kind, i.entry?.id, i.detail.fields])).toEqual([
            ['edit', 'a', ['summary', 'images']],
            ['edit', 'g', ['name', 'arcs.s1.displayName', 'arcs.s1.titles']],
        ]);
    });

    it('should report new daily dates', () => {
        const items = summarizeChanges(
            doc([], [daily('c', ['2026-11-01'])]),
            doc([], [daily('c', ['2026-11-01', '2026-11-02', '2026-11-03'])]),
            TODAY,
        ).items;
        expect(items.map((i) => [i.kind, i.detail])).toEqual([
            ['newEpisodes', { dates: ['2026-11-02', '2026-11-03'] }],
        ]);
    });

    it('should put a rollback first', () => {
        const d = doc([show('a')], []);
        const items = summarizeChanges(d, d, TODAY, { rollbackOf: 7 }).items;
        expect(items).toEqual([{ kind: 'rollback', when: 'now', detail: { publishId: 7 } }]);
    });

    it('should order the timeline: now first, then dates ascending', () => {
        const next = doc(
            [show('a')],
            [
                series('late', [ARC1], { addedAt: '2026-12-20' }),
                series('soon', [ARC1], { addedAt: '2026-11-15' }),
            ],
        );
        const { timeline } = summarizeChanges(doc([], []), next, TODAY);
        expect(timeline.map((g) => [g.when, g.items.length])).toEqual([
            ['now', 1],
            ['2026-11-15', 2],
            ['2026-12-20', 2],
        ]);
    });
});
