import type { TodoRow } from '../../api/types';
import {
    incompleteText,
    isRowDone,
    missingOf,
    mustCount,
    rowMeta,
    todoStats,
    splitName,
    todoHref,
    todoKey,
    rowTarget,
} from './todoModel';

const NA = { state: 'na' } as const;
const row = (over: Partial<TodoRow> = {}): TodoRow => ({
    key: 'newArc/lancy/arc-01',
    publish: 'incomplete',
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: 'arc-01',
    name: '蘭茜夫人劇場 · 我心不死',
    cells: {
        folder: NA,
        id: { state: 'must', target: '/dramas/lancy/arcs#arc-01' },
        images: { state: 'optional', target: '/dramas/lancy/arcs#arc-01' },
        schedule: { state: 'must', target: '/dramas/lancy/schedule#arc-01' },
        summary: { state: 'done', target: '/dramas/lancy/arcs#arc-01' },
    },
    ...over,
});

describe('todoModel', () => {
    it('should keep the hash at the end of the deep link', () => {
        expect(todoHref('/dramas/lancy/schedule#arc-01', todoKey(row()))).toBe(
            '/dramas/lancy/schedule?from=todos&todo=newArc%3Alancy%3Aarc-01#arc-01',
        );
        expect(todoHref('/dramas/lancy', 'k')).toBe('/dramas/lancy?from=todos&todo=k');
    });

    it('should list the missing must cells', () => {
        expect(missingOf(row())).toEqual(['ID', '排期']);
        expect(mustCount([row(), row()])).toBe(4);
        expect(isRowDone(row())).toBe(false);
    });

    it('should treat a row with only done / na cells as done', () => {
        const done = row({
            cells: { folder: NA, id: NA, images: NA, schedule: { state: 'done' }, summary: NA },
        });
        expect(isRowDone(done)).toBe(true);
    });

    it('should split arc rows into arc title + drama meta', () => {
        expect(splitName(row())).toEqual({ title: '我心不死', drama: '蘭茜夫人劇場' });
        expect(rowMeta(row(), 37)).toBe('蘭茜夫人劇場 · 新短篇 · 37 集');
        expect(rowMeta(row({ kind: 'newDrama', arcId: null, name: '天使之戀系列' }), 24)).toBe(
            '新廣播劇 · 24 集',
        );
    });

    it('should count rows, must / optional cells and finished rows for the stat cards', () => {
        const done = row({
            cells: {
                ...row().cells,
                id: { state: 'done' },
                images: { state: 'done' },
                schedule: { state: 'done' },
            },
        });
        expect(todoStats([row(), done])).toEqual({ rows: 2, must: 2, optional: 1, done: 1 });
    });

    it('should send each row to the editor of its content', () => {
        expect(rowTarget(row({ kind: 'newDrama', dramaId: 'drama-01', arcId: null }))).toBe(
            '/dramas/drama-01',
        );
        expect(rowTarget(row())).toBe('/dramas/lancy/arcs#arc-01');
        expect(rowTarget(row({ kind: 'newEpisodes', arcId: 's1' }))).toBe('/dramas/lancy/arcs#s1');
        expect(rowTarget(row({ kind: 'newEpisodes', arcId: null }))).toBe('/dramas/lancy');
        expect(rowTarget(row({ kind: 'missingFolder', arcId: null }))).toBe('/dramas/lancy#folder');
    });

    it('should encode the drama ID in the path (S-828)', () => {
        expect(rowTarget(row({ kind: 'missingFolder', dramaId: 'a b', arcId: null }))).toBe(
            '/dramas/a%20b#folder',
        );
        expect(rowTarget(row({ kind: 'newDrama', dramaId: 'a/b', arcId: null }))).toBe(
            '/dramas/a%2Fb',
        );
    });

    it('should name what is missing for an incomplete row, or just the name when nothing is', () => {
        expect(incompleteText('我心不死', row())).toBe('我心不死（尚未設定ID、排期）');
        const draft = row({ cells: { ...row().cells, id: NA, schedule: NA } });
        expect(incompleteText('我心不死', draft)).toBe('我心不死');
    });
});
