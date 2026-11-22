import type { TodoRow } from '../../api/types';
import { todoHref, todoKey } from '../update/todoModel';
import { renamedDramaUrl } from './renamedUrl';

const row = (kind: TodoRow['kind'], dramaId: string, arcId: string | null) =>
    ({ kind, dramaId, arcId }) as TodoRow;

const ROWS = [
    row('newDrama', 'drama-01', null),
    row('newArc', 'drama-01', 'drama-01-01'),
    row('newArc', 'drama-01', 'special'),
    row('newArc', 'other', 'other-01'),
];

/** 待辦跳入嚟嘅 URL（同 TodoMatrix 一樣用 todoHref） */
const locationOf = (target: string, key: string) => {
    const url = new URL(todoHref(target, key), 'http://admin.invalid');
    return { pathname: url.pathname, search: url.search, hash: url.hash };
};

const moved = (target: string, key: string) =>
    renamedDramaUrl(locationOf(target, key), ROWS, 'drama-01', 'lancy');

describe('renamedDramaUrl', () => {
    it('should move the path and the remembered auto-numbered arc', () => {
        const location = { pathname: '/dramas/drama-01/arcs', search: '', hash: '#drama-01-01' };
        expect(renamedDramaUrl(location, ROWS, 'drama-01', 'lancy')).toBe(
            '/dramas/lancy/arcs#lancy-01',
        );
    });

    it('should keep other hashes and a query without a todo', () => {
        const location = { pathname: '/dramas/drama-01', search: '?x=1', hash: '#folder' };
        expect(renamedDramaUrl(location, ROWS, 'drama-01', 'lancy')).toBe(
            '/dramas/lancy?x=1#folder',
        );
    });

    it('should point ?todo= at the same row under the new drama ID (S-1395)', () => {
        expect(moved('/dramas/drama-01', todoKey(ROWS[0] as TodoRow))).toBe(
            todoHref('/dramas/lancy', todoKey(row('newDrama', 'lancy', null))),
        );
    });

    it('should rename an auto-numbered arc inside ?todo= and keep a custom arc ID (S-1395)', () => {
        expect(moved('/dramas/drama-01/arcs#drama-01-01', todoKey(ROWS[1] as TodoRow))).toBe(
            todoHref('/dramas/lancy/arcs#lancy-01', todoKey(row('newArc', 'lancy', 'lancy-01'))),
        );
        expect(moved('/dramas/drama-01/arcs#special', todoKey(ROWS[2] as TodoRow))).toBe(
            todoHref('/dramas/lancy/arcs#special', todoKey(row('newArc', 'lancy', 'special'))),
        );
    });

    it('should leave a ?todo= that is not a row of this drama as it is', () => {
        expect(moved('/dramas/drama-01', todoKey(ROWS[3] as TodoRow))).toBe(
            todoHref('/dramas/lancy', todoKey(ROWS[3] as TodoRow)),
        );
        expect(moved('/dramas/drama-01', 'unknown')).toBe(todoHref('/dramas/lancy', 'unknown'));
    });
});
