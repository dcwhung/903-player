import { DRAMAS, enabledDramas, findDrama, findEnabledDrama } from './dramas';

describe('dramas', () => {
    it('keeps 18 樓 C 座 configured but switched off for now', () => {
        expect(DRAMAS.map((d) => d.id)).toEqual(['chisee', 'c18']);
        expect(enabledDramas().map((d) => d.name)).toEqual(['芝See菇Bi Family']);
    });

    it('still names a disabled drama, but does not open it', () => {
        expect(findDrama('c18')?.name).toBe('18 樓 C 座');
        expect(findEnabledDrama('c18')).toBeUndefined();
        expect(findEnabledDrama('chisee')?.name).toBe('芝See菇Bi Family');
    });
});
