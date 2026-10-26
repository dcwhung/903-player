import { DramaSchemaError, parseDramaDefinition, type DramaDefinition } from './schema';

const THEME = {
    scheme: 'light',
    bg: '#f7e7b4',
    surface: '#fdf3d3',
    track: '#e8c869',
    accent: '#f2c21b',
    onAccent: '#3a2600',
    title: '#7f5500',
    accentText: '#7f5500',
    text: '#3b2a0e',
    muted: '#6b5121',
    shadowDark: '#e0c77e',
    shadowLight: '#fff8e2',
    statusBar: '#8a5c00',
    headerRule: 'linear-gradient(90deg, #af7a08, #f2c21b, #af7a08) 0 100% / 100% 3px no-repeat',
};

const SERIES = {
    name: '黃金少年',
    kind: 'series',
    enabled: true,
    order: 3,
    arcUnit: 'season',
    addedAt: '2026-10-24',
    tile: 'tile.webp',
    disc: 'season-1-disc.webp',
    audio: {
        host: 'r2',
        folder: '黃金少年',
        file: '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
    },
    theme: THEME,
    arcs: [
        { name: 'Season 1', disc: 'season-1-disc.webp', episodes: 2 },
        { name: 'Season 2', episodes: ['前傳', null, '後傳'], firstNo: 0, addedAt: '2026-10-25' },
        {
            name: 'Season 3',
            episodes: 3,
            titles: { '3': '最終結局' },
            files: { '2': 'odd name.m4a' },
        },
    ],
};

const DAILY = {
    name: '18 樓 C 座',
    kind: 'daily',
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'app', folder: 'c18', file: '{yyyymmdd}.m4a' },
    theme: { ...THEME, titleFont: "'Noto Serif TC', serif" },
    episodes: [{ date: '2026-10-23' }, { date: '2025-08-13', rerun: true, file: 'old.m4a' }],
};

const FILES = new Set(['tile.webp', 'disc.webp', 'season-1-disc.webp']);
const ctx = (id: string) => ({ id, source: `src/dramas/${id}/drama.json`, files: FILES });

const parse = (raw: unknown, id = 'golden'): DramaDefinition => parseDramaDefinition(raw, ctx(id));

/** 第一個參數係 JSON 內容嘅局部覆蓋；第二個係要刪走嘅 key */
const seriesWith = (patch: Record<string, unknown>, drop: readonly string[] = []) => {
    const raw: Record<string, unknown> = { ...SERIES, ...patch };
    drop.forEach((key) => delete raw[key]);
    return raw;
};

describe('parseDramaDefinition', () => {
    it('normalises a series drama: counts, title maps, per-arc defaults', () => {
        const def = parse(SERIES);
        expect(def.kind).toBe('series');
        if (def.kind !== 'series') return;
        expect(def.name).toBe('黃金少年');
        expect(def.order).toBe(3);
        expect(def.arcUnit).toBe('season');
        expect(def.addedAt).toBe('2026-10-24');
        expect(def.audio).toEqual(SERIES.audio);
        expect(def.theme).toEqual(THEME);
        expect(def.arcs.map((a) => a.name)).toEqual(['Season 1', 'Season 2', 'Season 3']);

        const [s1, s2, s3] = def.arcs;
        expect(s1).toMatchObject({ disc: 'season-1-disc.webp', firstNo: 1, count: 2 });
        expect(s1?.titles.size).toBe(0);
        expect(s1?.addedAt).toBeUndefined();

        expect(s2).toMatchObject({ firstNo: 0, count: 3, addedAt: '2026-10-25' });
        expect([...(s2?.titles ?? [])]).toEqual([
            [0, '前傳'],
            [2, '後傳'],
        ]);

        expect([...(s3?.titles ?? [])]).toEqual([[3, '最終結局']]);
        expect([...(s3?.files ?? [])]).toEqual([[2, 'odd name.m4a']]);
    });

    it('normalises a daily drama: rerun defaults to false, order is optional', () => {
        const def = parse(DAILY, 'c18');
        expect(def.kind).toBe('daily');
        if (def.kind !== 'daily') return;
        expect(def.enabled).toBe(false);
        expect(def.order).toBeUndefined();
        expect(def.theme.titleFont).toBe("'Noto Serif TC', serif");
        expect(def.episodes).toEqual([
            { date: '2026-10-23', rerun: false },
            { date: '2025-08-13', rerun: true, file: 'old.m4a' },
        ]);
    });

    it('throws a DramaSchemaError that names the file and the field', () => {
        expect(() => parse(seriesWith({}, ['name']))).toThrow(DramaSchemaError);
        expect(() => parse(seriesWith({}, ['name']))).toThrow(
            'src/dramas/golden/drama.json: name must be a non-empty string',
        );
    });

    it.each([
        ['a non-object file', 'nope', /drama\.json must be an object/],
        ['an unknown kind', seriesWith({ kind: 'weekly' }), /kind must be one of series, daily/],
        ['a non-boolean enabled', seriesWith({ enabled: 'yes' }), /enabled must be a boolean/],
        ['a non-integer order', seriesWith({ order: 1.5 }), /order must be an integer/],
        ['an unknown arcUnit', seriesWith({ arcUnit: 'part' }), /arcUnit must be one of season/],
        [
            'a non-hex colour',
            seriesWith({ theme: { ...THEME, bg: 'yellow' } }),
            /theme\.bg must be a #rrggbb colour/,
        ],
        [
            'a missing colour',
            seriesWith({ theme: { ...THEME, muted: undefined } }),
            /theme\.muted must be a #rrggbb colour/,
        ],
        [
            'a dark scheme',
            seriesWith({ theme: { ...THEME, scheme: 'dark' } }),
            /theme\.scheme must be one of light/,
        ],
        ['a bad date', seriesWith({ addedAt: '2026-13-01' }), /addedAt must be a YYYY-MM-DD date/],
        [
            'a tile not in the folder',
            seriesWith({ tile: 'cover.webp' }),
            /tile: no file cover\.webp in the folder/,
        ],
        [
            'an arc disc not in the folder',
            seriesWith({ arcs: [{ name: 'S', disc: 'x.webp', episodes: 1 }] }),
            /arcs\[0\]\.disc: no file x\.webp/,
        ],
        [
            'an unknown audio host',
            seriesWith({ audio: { ...SERIES.audio, host: 's3' } }),
            /audio\.host must be one of r2, app/,
        ],
        [
            'an unknown template token',
            seriesWith({ audio: { ...SERIES.audio, file: '{no2} - {season}.m4a' } }),
            /audio\.file: unknown token \{season\}/,
        ],
        [
            'a series token in a daily template',
            { ...DAILY, audio: { ...DAILY.audio, file: '{title}.m4a' } },
            /audio\.file: unknown token \{title\}/,
        ],
        ['an empty arcs list', seriesWith({ arcs: [] }), /arcs must not be empty/],
        [
            'a duplicate arc name',
            seriesWith({
                arcs: [
                    { name: 'S', episodes: 1 },
                    { name: 'S', episodes: 1 },
                ],
            }),
            /arcs\[1\]\.name: duplicate arc S/,
        ],
        [
            'a zero episode count',
            seriesWith({ arcs: [{ name: 'S', episodes: 0 }] }),
            /arcs\[0\]\.episodes must be a positive integer or a list of titles/,
        ],
        [
            'a non-string title in the list',
            seriesWith({ arcs: [{ name: 'S', episodes: [1] }] }),
            /arcs\[0\]\.episodes\[0\] must be a string or null/,
        ],
        [
            'a negative firstNo',
            seriesWith({ arcs: [{ name: 'S', episodes: 1, firstNo: -1 }] }),
            /arcs\[0\]\.firstNo must be a non-negative integer/,
        ],
        [
            'a title outside the arc',
            seriesWith({ arcs: [{ name: 'S', episodes: 2, titles: { '3': 'x' } }] }),
            /arcs\[0\]\.titles\["3"\] is outside 1–2/,
        ],
        [
            'a file override outside the arc',
            seriesWith({ arcs: [{ name: 'S', episodes: 2, firstNo: 0, files: { '2': 'x' } }] }),
            /arcs\[0\]\.files\["2"\] is outside 0–1/,
        ],
        [
            'a non-integer title key',
            seriesWith({ arcs: [{ name: 'S', episodes: 2, titles: { one: 'x' } }] }),
            /arcs\[0\]\.titles\["one"\] must be an episode number/,
        ],
        [
            'daily episodes on a series drama',
            seriesWith({ episodes: [] }, ['arcs']),
            /arcs must not be empty/,
        ],
        ['an empty daily list', { ...DAILY, episodes: [] }, /episodes must not be empty/],
        [
            'a duplicate daily date',
            { ...DAILY, episodes: [{ date: '2026-10-23' }, { date: '2026-10-23' }] },
            /episodes\[1\]\.date: duplicate date 2026-10-23/,
        ],
        [
            'a bad daily date',
            { ...DAILY, episodes: [{ date: '23/10/2026' }] },
            /episodes\[0\]\.date must be a YYYY-MM-DD date/,
        ],
    ])('rejects %s', (_label, raw, message) => {
        expect(() => parse(raw)).toThrow(message);
    });

    it('rejects a folder name that cannot be a route id', () => {
        expect(() => parse(SERIES, 'Golden Boy')).toThrow(
            'src/dramas/Golden Boy/drama.json: folder name must match /^[a-z][a-z0-9-]*$/',
        );
    });
});
