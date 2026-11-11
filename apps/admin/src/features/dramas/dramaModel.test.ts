import { reorderArcs, updateArc, withTitles } from './dramaModel';

describe('dramaModel', () => {
    const drama = {
        arcs: [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
        ],
    };

    it('should update one arc and reorder arcs', () => {
        expect(updateArc(drama, 'b', (arc) => ({ ...arc, enabled: false })).arcs).toEqual([
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B', enabled: false },
        ]);
        expect(reorderArcs(drama, ['b', 'a']).arcs).toEqual([
            { id: 'b', name: 'B' },
            { id: 'a', name: 'A' },
        ]);
    });

    it('should write titles into a numbered arc and drop an empty map', () => {
        expect(withTitles({ id: 'a', episodes: 3 }, { 3: '初次見面' })).toEqual({
            id: 'a',
            episodes: 3,
            titles: { 3: '初次見面' },
        });
        expect(withTitles({ id: 'a', episodes: 3, titles: { 1: 'x' } }, {})).toEqual({
            id: 'a',
            episodes: 3,
        });
    });

    it('should rewrite an episode-name list in place', () => {
        expect(
            withTitles({ id: 'a', episodes: ['x', null], titles: { 1: 'y' } }, { 2: '大結局' }),
        ).toEqual({
            id: 'a',
            episodes: [null, '大結局'],
        });
    });
});
