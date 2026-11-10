import { arcLabelOf } from './arcLabel';

describe('arcLabelOf', () => {
    it('should prefer the arcLabel and fall back to the arc name', () => {
        expect(arcLabelOf({ arc: 'R2 名', arcLabel: '顯示名' })).toBe('顯示名');
        expect(arcLabelOf({ arc: 'R2 名' })).toBe('R2 名');
    });
});
