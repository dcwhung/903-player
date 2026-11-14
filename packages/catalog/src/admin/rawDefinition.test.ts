import { sameJson } from '../index';

describe('sameJson', () => {
    it('should ignore key order at every level (#5: admin 編輯頁「已修改」)', () => {
        expect(sameJson({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    });

    it('should still see different values and array order', () => {
        expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameJson([1, 2], [2, 1])).toBe(false);
    });
});
