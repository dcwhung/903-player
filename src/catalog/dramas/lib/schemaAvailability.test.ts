/* drama.json 上架 / 下架欄位（P8 #6，_mockups_/coming-soon ⑤）嘅驗證 */
import { parseDramaDefinition, type DramaDefinition, type SeriesDefinition } from './schema';

const THEME = {
    bg: '#f3efde',
    surface: '#faf7ec',
    track: '#e0d6b8',
    accent: '#d45f32',
    onAccent: '#ffffff',
    title: '#a8401a',
    text: '#33281d',
    muted: '#6b5a47',
    shadowDark: '#e0d6b8',
    shadowLight: '#ffffff',
};

const BASE = {
    name: '蘭茜夫人劇場',
    kind: 'series',
    enabled: true,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: 'lancy', file: '{arc}/{no}.m4a' },
    theme: THEME,
};

const series = (patch: Record<string, unknown>, arcs: readonly unknown[]): unknown => ({
    ...BASE,
    ...patch,
    arcs,
});

const DAILY = {
    ...BASE,
    kind: 'daily',
    audio: { host: 'app', folder: 'c18', file: '{yyyymmdd}.m4a' },
    episodes: [{ date: '2026-10-23' }],
};

const parse = (raw: unknown): DramaDefinition =>
    parseDramaDefinition(raw, {
        id: 'lancy',
        source: 'src/catalog/dramas/library/lancy/drama.json',
        files: new Set(['tile.webp', 'disc.webp']),
    });

const parseSeries = (raw: unknown): SeriesDefinition => {
    const def = parse(raw);
    if (def.kind !== 'series') throw new Error('expected a series drama');
    return def;
};

describe('parseDramaDefinition availability fields', () => {
    it('should read drama-level addedAt and removedAt on a daily drama', () => {
        const def = parse({ ...DAILY, addedAt: '2026-12-01', removedAt: '2027-01-01' });
        expect(def).toMatchObject({ addedAt: '2026-12-01', removedAt: '2027-01-01' });
    });

    it('should leave count undefined when an upcoming arc has no episodes yet', () => {
        const def = parseSeries(series({}, [{ name: 'XXX', addedAt: '2026-11-12' }]));
        expect(def.arcs[0]?.count).toBeUndefined();
    });

    it('should accept a missing episodes list when only the drama has addedAt', () => {
        const def = parseSeries(series({ addedAt: '2026-12-01' }, [{ name: 'XXX' }]));
        expect(def.arcs[0]?.count).toBeUndefined();
    });

    it('should read episodeDates as episode number to date', () => {
        const def = parseSeries(
            series({}, [
                {
                    name: '戀愛二分一',
                    episodes: 30,
                    episodeDates: { '11': '2026-11-19', '21': '2026-11-26' },
                },
            ]),
        );
        expect([...(def.arcs[0]?.episodeDates ?? [])]).toEqual([
            [11, '2026-11-19'],
            [21, '2026-11-26'],
        ]);
    });

    it('should read removedAt on all three levels, episode keys as single numbers or ranges', () => {
        const def = parseSeries(
            series({ removedAt: '2026-12-05' }, [
                {
                    name: '戀愛二分一',
                    episodes: 30,
                    removedAt: '2026-12-04',
                    episodeRemovedAt: { '3': '2026-12-01', '6-8': '2026-12-02' },
                },
            ]),
        );
        expect(def.removedAt).toBe('2026-12-05');
        expect(def.arcs[0]?.removedAt).toBe('2026-12-04');
        expect(def.arcs[0]?.episodeRemovedAt).toEqual([
            { first: 3, last: 3, date: '2026-12-01' },
            { first: 6, last: 8, date: '2026-12-02' },
        ]);
    });

    it.each([
        [
            'an arc without episodes or any addedAt',
            series({}, [{ name: 'XXX' }]),
            /arcs\[0\]\.episodes must be a positive integer or a list of titles \(or leave it out with an addedAt\)/,
        ],
        [
            'an episodeDates key outside the arc',
            series({}, [{ name: 'S', episodes: 10, episodeDates: { '11': '2026-11-19' } }]),
            /arcs\[0\]\.episodeDates\["11"\] is outside 1–10/,
        ],
        [
            'an episodeDates key on the first episode',
            series({}, [{ name: 'S', episodes: 10, episodeDates: { '1': '2026-11-19' } }]),
            /arcs\[0\]\.episodeDates\["1"\] must be after the first episode/,
        ],
        [
            'episodeDates that go backwards',
            series({}, [
                {
                    name: 'S',
                    episodes: 30,
                    episodeDates: { '11': '2026-11-26', '21': '2026-11-19' },
                },
            ]),
            /arcs\[0\]\.episodeDates\["21"\] must be later than episode 11's date/,
        ],
        [
            'an episodeDates date not after the arc addedAt',
            series({}, [
                {
                    name: 'S',
                    addedAt: '2026-11-19',
                    episodes: 30,
                    episodeDates: { '11': '2026-11-19' },
                },
            ]),
            /arcs\[0\]\.episodeDates\["11"\] must be later than addedAt 2026-11-19/,
        ],
        [
            'a drama removedAt not after its addedAt',
            series({ addedAt: '2026-12-01', removedAt: '2026-12-01' }, [
                { name: 'S', episodes: 1 },
            ]),
            /removedAt must be later than addedAt 2026-12-01/,
        ],
        [
            'an arc removedAt later than the drama removedAt',
            series({ removedAt: '2026-12-05' }, [
                { name: 'S', episodes: 1, removedAt: '2026-12-06' },
            ]),
            /arcs\[0\]\.removedAt must not be later than the drama removedAt 2026-12-05/,
        ],
        [
            'an arc removedAt not after the arc addedAt',
            series({}, [
                { name: 'S', episodes: 1, addedAt: '2026-12-01', removedAt: '2026-11-30' },
            ]),
            /arcs\[0\]\.removedAt must be later than addedAt 2026-12-01/,
        ],
        [
            'an episode removedAt later than the arc removedAt',
            series({}, [
                {
                    name: 'S',
                    episodes: 5,
                    removedAt: '2026-12-05',
                    episodeRemovedAt: { '1-2': '2026-12-06' },
                },
            ]),
            /arcs\[0\]\.episodeRemovedAt\["1-2"\] must not be later than the arc removedAt 2026-12-05/,
        ],
        [
            'an episode removedAt not after that batch date',
            series({}, [
                {
                    name: 'S',
                    episodes: 30,
                    episodeDates: { '11': '2026-11-19' },
                    episodeRemovedAt: { '12': '2026-11-19' },
                },
            ]),
            /arcs\[0\]\.episodeRemovedAt\["12"\] must be later than 2026-11-19/,
        ],
        [
            'overlapping episode removal ranges',
            series({}, [
                {
                    name: 'S',
                    episodes: 30,
                    episodeRemovedAt: { '1-5': '2026-12-05', '5': '2026-12-06' },
                },
            ]),
            /arcs\[0\]\.episodeRemovedAt\["(?:5|1-5)"\] overlaps another range/,
        ],
        [
            'a reversed removal range',
            series({}, [{ name: 'S', episodes: 30, episodeRemovedAt: { '5-1': '2026-12-05' } }]),
            /arcs\[0\]\.episodeRemovedAt\["5-1"\] must be an episode number or a range like "1-5"/,
        ],
        [
            'a removal range outside the arc',
            series({}, [{ name: 'S', episodes: 5, episodeRemovedAt: { '4-6': '2026-12-05' } }]),
            /arcs\[0\]\.episodeRemovedAt\["4-6"\] is outside 1–5/,
        ],
        [
            'episodeRemovedAt on an arc without episodes',
            series({}, [
                { name: 'S', addedAt: '2026-11-12', episodeRemovedAt: { '1': '2026-12-05' } },
            ]),
            /arcs\[0\]\.episodeRemovedAt needs episodes/,
        ],
        [
            'a bad removedAt date',
            series({ removedAt: '2026-02-30' }, [{ name: 'S', episodes: 1 }]),
            /removedAt must be a YYYY-MM-DD date/,
        ],
    ])('should reject %s', (_label, raw, message) => {
        expect(() => parse(raw)).toThrow(message);
    });
});
