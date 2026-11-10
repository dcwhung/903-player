import { parseShowDefinition, ShowSchemaError } from './schema';

const THEME = {
    bg: '#21151a',
    surface: '#2e1e24',
    track: '#4a3540',
    accent: '#f08a24',
    onAccent: '#21151a',
    title: '#f6c987',
    text: '#f6eee8',
    muted: '#c2aaa6',
    shadowDark: '#160d11',
    shadowLight: '#352329',
};

const SHOW = {
    name: 'Bad Girl大過佬',
    fileTime: '1009',
    airDays: [1, 2, 3, 4, 5],
    order: 1,
    tile: 'tile.webp',
    disc: 'disc.webp',
    theme: THEME,
};

const ctx = (id = 'badgirl') => ({
    id,
    source: `src/catalog/shows/library/${id}/show.json`,
    files: new Set(['tile.webp', 'disc.webp']),
});

describe('parseShowDefinition', () => {
    it('reads a show with its schedule, tile, disc and dark theme', () => {
        expect(parseShowDefinition(SHOW, ctx())).toEqual(SHOW);
    });

    it('leaves order undefined when absent', () => {
        const { order: _order, ...noOrder } = SHOW;
        void _order;
        expect(parseShowDefinition(noOrder, ctx()).order).toBeUndefined();
    });

    it('throws a ShowSchemaError naming the file and the field', () => {
        expect(() => parseShowDefinition({ ...SHOW, name: '' }, ctx())).toThrow(ShowSchemaError);
        expect(() => parseShowDefinition({ ...SHOW, name: '' }, ctx())).toThrow(
            'src/catalog/shows/library/badgirl/show.json: name must be a non-empty string',
        );
    });

    it.each([
        ['a non-object file', [], /show\.json must be an object/],
        ['a file time with letters', { ...SHOW, fileTime: '10am' }, /fileTime must be HHMM/],
        ['an impossible hour', { ...SHOW, fileTime: '2460' }, /fileTime must be HHMM/],
        ['no air days', { ...SHOW, airDays: [] }, /airDays must not be empty/],
        ['a weekday out of range', { ...SHOW, airDays: [7] }, /airDays\[0\] must be a weekday 0–6/],
        ['a fractional weekday', { ...SHOW, airDays: [1.5] }, /airDays\[0\] must be a weekday 0–6/],
        ['a repeated weekday', { ...SHOW, airDays: [6, 6] }, /airDays\[1\]: duplicate weekday 6/],
        ['a non-integer order', { ...SHOW, order: '1' }, /order must be an integer/],
        ['a tile missing from the folder', { ...SHOW, tile: 'x.webp' }, /tile: no file x\.webp/],
        ['a disc missing from the folder', { ...SHOW, disc: 'x.webp' }, /disc: no file x\.webp/],
        [
            'a bad colour',
            { ...SHOW, theme: { ...THEME, accent: 'orange' } },
            /theme\.accent must be a #rrggbb colour/,
        ],
    ])('rejects %s', (_label, raw, message) => {
        expect(() => parseShowDefinition(raw, ctx())).toThrow(message);
    });

    it('rejects a folder name that cannot be a route id', () => {
        expect(() => parseShowDefinition(SHOW, ctx('Bad Girl'))).toThrow(/folder name must match/);
    });

    describe('Phase 3 optional fields', () => {
        const FULL = {
            ...SHOW,
            enabled: false,
            summary: '由鄭裕玲主持',
            hosts: ['鄭裕玲', '余迪偉'],
            airTime: { start: '15:00', end: '16:30' },
        };

        it('should read enabled, summary, hosts and airTime', () => {
            expect(parseShowDefinition(FULL, ctx())).toEqual(FULL);
        });

        it('should leave the new fields out when absent', () => {
            const def = parseShowDefinition(SHOW, ctx());
            expect(Object.keys(def)).not.toEqual(
                expect.arrayContaining(['enabled', 'summary', 'hosts', 'airTime']),
            );
        });

        it.each([
            ['a non-boolean enabled', { enabled: 'no' }, /enabled must be a boolean/],
            ['an empty summary', { summary: '' }, /summary must be a non-empty string/],
            ['a summary over 500 characters', { summary: '字'.repeat(501) }, /at most 500/],
            ['hosts not a list', { hosts: '鄭裕玲' }, /hosts must be a list/],
            ['an empty host', { hosts: [''] }, /hosts\[0\] must be 1–40 characters/],
            ['a host over 40 characters', { hosts: ['名'.repeat(41)] }, /hosts\[0\]/],
            [
                'more than 12 hosts',
                { hosts: Array.from({ length: 13 }, (_, i) => `h${i}`) },
                /at most 12/,
            ],
            ['a duplicated host', { hosts: ['甲', '甲'] }, /hosts\[1\]: duplicate/],
            [
                'airTime crossing midnight',
                { airTime: { start: '23:00', end: '00:30' } },
                /airTime\.end must be after start/,
            ],
            [
                'airTime over 3 hours',
                { airTime: { start: '10:00', end: '13:15' } },
                /within 3 hours/,
            ],
        ])('should reject %s', (_label, patch, message) => {
            expect(() => parseShowDefinition({ ...SHOW, ...patch }, ctx())).toThrow(message);
        });

        it('should accept exactly 500 characters and 12 hosts of 40 characters', () => {
            const raw = {
                ...SHOW,
                summary: '字'.repeat(500),
                hosts: Array.from({ length: 12 }, (_, i) => `${i}`.padEnd(40, '名')),
            };
            expect(() => parseShowDefinition(raw, ctx())).not.toThrow();
        });
    });
});
