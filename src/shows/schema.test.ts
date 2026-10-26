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
    art: 'art.jpg',
    theme: THEME,
};

const ctx = (id = 'badgirl') => ({
    id,
    source: `src/shows/${id}/show.json`,
    files: new Set(['art.jpg']),
});

describe('parseShowDefinition', () => {
    it('reads a show with its schedule, art and dark theme', () => {
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
            'src/shows/badgirl/show.json: name must be a non-empty string',
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
        ['art missing from the folder', { ...SHOW, art: 'cover.jpg' }, /art: no file cover\.jpg/],
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
});
