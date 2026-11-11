import { collapseArcs, type ArcLine } from './arcLines';

const line = (key: string, tone: ArcLine['status']['tone'] = 'ok'): ArcLine => ({
    key,
    label: key,
    episodes: 1,
    status: { tone, text: '' },
    isNew: false,
});

describe('collapseArcs', () => {
    it('should show every arc when there are 4 or fewer', () => {
        expect(collapseArcs([line('a'), line('b'), line('c'), line('d')]).hidden).toBe(0);
    });

    it('should keep two arcs and hide the rest when all are live', () => {
        const result = collapseArcs(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k) => line(k)));
        expect(result.shown.map((l) => l.key)).toEqual(['a', 'b']);
        expect(result.hidden).toBe(5);
    });

    it('should always show arcs that are not plainly live', () => {
        const lines = [line('a'), line('b'), line('c', 'bad'), line('d'), line('e', 'info')];
        expect(collapseArcs(lines).shown.map((l) => l.key)).toEqual(['c', 'e']);
    });
});
