import { findShow, findShowByName } from './shows';

describe('findShowByName', () => {
    it.each([
        ['Bad Girl大過佬', 'badgirl'],
        ['Bad_Girl大過佬', 'badgirl'],
        ['  bad girl大過佬 ', 'badgirl'],
        ['雲妮鍾情', 'wanni'],
        ['雲妮鐘情', 'wanni'],
        ['公子會', 'gongzi'],
    ])('matches %s', (label, id) => {
        expect(findShowByName(label)?.id).toBe(id);
    });

    it('returns undefined for shows the app does not list', () => {
        expect(findShowByName('口水多過浪花')).toBeUndefined();
    });
});

describe('findShow', () => {
    it('finds by id', () => {
        expect(findShow('westair')?.name).toBe('西加航空');
        expect(findShow('nope')).toBeUndefined();
    });
});
