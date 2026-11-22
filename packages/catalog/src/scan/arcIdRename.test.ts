import { describe, expect, it } from 'vitest';
import { renamedArcId, withRenamedArcIds } from './arcIdRename';

describe('renamedArcId', () => {
    it('should move an auto-numbered arc id (<from>-NN) to the new drama id', () => {
        expect(renamedArcId('drama-01-01', 'drama-01', 'lancy')).toBe('lancy-01');
        expect(renamedArcId('drama-01-12', 'drama-01', 'lancy')).toBe('lancy-12');
    });

    it('should leave custom arc ids untouched', () => {
        expect(renamedArcId('season-1', 'drama-01', 'lancy')).toBe('season-1');
        expect(renamedArcId('drama-01-extra', 'drama-01', 'lancy')).toBe('drama-01-extra');
    });

    it.each([
        'drama-01-1',
        'drama-01-abc',
        'drama-01x-01',
        'drama-01-001',
        'drama-01',
        'x-drama-01-01',
    ])('should leave the prefix-only lookalike %s untouched', (arcId) => {
        expect(renamedArcId(arcId, 'drama-01', 'lancy')).toBe(arcId);
    });
});

describe('withRenamedArcIds', () => {
    it('should rename only auto-numbered arc ids and keep every other field', () => {
        const definition = {
            name: 'Drama',
            arcs: [
                { id: 'drama-01-01', name: 'Season 1', episodes: 3 },
                { id: 'drama-01-extra', name: 'Extra', episodes: 1 },
                { name: 'No id yet' },
                'broken',
            ],
        };
        expect(withRenamedArcIds(definition, 'drama-01', 'lancy')).toEqual({
            name: 'Drama',
            arcs: [
                { id: 'lancy-01', name: 'Season 1', episodes: 3 },
                { id: 'drama-01-extra', name: 'Extra', episodes: 1 },
                { name: 'No id yet' },
                'broken',
            ],
        });
        expect(definition.arcs[0]).toMatchObject({ id: 'drama-01-01' });
    });

    it('should return a definition without an arc list as it is', () => {
        const definition = { name: 'Daily', arcs: 'nope' };
        expect(withRenamedArcIds(definition, 'drama-01', 'lancy')).toBe(definition);
    });
});
