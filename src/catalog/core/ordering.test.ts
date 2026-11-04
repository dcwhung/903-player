import { compareOrderThenId } from './ordering';

describe('compareOrderThenId', () => {
    it('sorts by order first, then unordered items by id', () => {
        const items = [
            { id: 'zeta', order: undefined },
            { id: 'alpha', order: 2 },
            { id: 'off', order: 1 },
            { id: 'beta', order: undefined },
        ];
        expect([...items].sort(compareOrderThenId).map((i) => i.id)).toEqual([
            'off',
            'alpha',
            'beta',
            'zeta',
        ]);
    });
});
