import {
    checkId,
    readBoolean,
    readEnum,
    readHex,
    readImage,
    readNonEmptyArray,
    readOptionalDate,
    readOptionalImage,
    readOptionalInteger,
    readRecord,
    readString,
    SchemaError,
} from './reader';

const ctx = { id: 'alpha', source: 'src/x/alpha/x.json', files: new Set(['art.jpg']) };

describe('reader', () => {
    it('prefixes every error with the source file and names the field', () => {
        expect(() => readString(ctx, {}, 'name')).toThrow(SchemaError);
        expect(() => readString(ctx, {}, 'name')).toThrow(
            'src/x/alpha/x.json: name must be a non-empty string',
        );
        expect(() => readString(ctx, { name: '' }, 'name', 'arcs[0].name')).toThrow(
            'arcs[0].name must be a non-empty string',
        );
    });

    it('reads records, strings, booleans and integers', () => {
        expect(readRecord(ctx, { a: 1 }, 'root')).toEqual({ a: 1 });
        expect(() => readRecord(ctx, [], 'root')).toThrow('root must be an object');
        expect(readString(ctx, { name: 'x' }, 'name')).toBe('x');
        expect(readBoolean(ctx, { on: true }, 'on')).toBe(true);
        expect(readBoolean(ctx, {}, 'on', 'on', false)).toBe(false);
        expect(() => readBoolean(ctx, { on: 'yes' }, 'on')).toThrow('on must be a boolean');
        expect(readOptionalInteger(ctx, { order: 3 }, 'order')).toBe(3);
        expect(readOptionalInteger(ctx, {}, 'order')).toBeUndefined();
        expect(() => readOptionalInteger(ctx, { order: 1.5 }, 'order')).toThrow(
            'order must be an integer',
        );
    });

    it('reads enums, colours and dates', () => {
        expect(readEnum(ctx, { kind: 'daily' }, 'kind', 'kind', ['series', 'daily'])).toBe('daily');
        expect(() =>
            readEnum(ctx, { kind: 'weekly' }, 'kind', 'kind', ['series', 'daily']),
        ).toThrow('kind must be one of series, daily');
        expect(readHex(ctx, { bg: '#ABCDEF' }, 'bg')).toBe('#ABCDEF');
        expect(() => readHex(ctx, { bg: '#abc' }, 'bg', 'theme.bg')).toThrow(
            'theme.bg must be a #rrggbb colour',
        );
        expect(readOptionalDate(ctx, { addedAt: '2026-10-24' }, 'addedAt')).toBe('2026-10-24');
        expect(readOptionalDate(ctx, {}, 'addedAt')).toBeUndefined();
        expect(() => readOptionalDate(ctx, { addedAt: '2026-02-30' }, 'addedAt')).toThrow(
            'addedAt must be a YYYY-MM-DD date',
        );
    });

    it('only accepts images that exist in the folder', () => {
        expect(readImage(ctx, { art: 'art.jpg' }, 'art')).toBe('art.jpg');
        expect(() => readImage(ctx, { art: 'cover.jpg' }, 'art')).toThrow(
            'art: no file cover.jpg in the folder',
        );
        expect(readOptionalImage(ctx, {}, 'disc')).toBeUndefined();
    });

    it('reads non-empty arrays', () => {
        expect(readNonEmptyArray(ctx, { arcs: [1] }, 'arcs')).toEqual([1]);
        expect(() => readNonEmptyArray(ctx, { arcs: [] }, 'arcs')).toThrow(
            'arcs must not be empty',
        );
        expect(() => readNonEmptyArray(ctx, {}, 'arcs')).toThrow('arcs must not be empty');
    });

    it('rejects a folder name that cannot be a route id', () => {
        expect(() => checkId({ ...ctx, id: 'Golden Boy' })).toThrow(
            'folder name must match /^[a-z][a-z0-9-]*$/',
        );
        expect(() => checkId({ ...ctx, id: 'c18' })).not.toThrow();
    });
});
