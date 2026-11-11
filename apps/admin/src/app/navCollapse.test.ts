import { isNavMini, readNavPref, writeNavPref, NAV_PREF_KEY } from './navCollapse';

describe('nav collapse', () => {
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('should follow the saved choice on a wide window', () => {
        expect(isNavMini({ pref: 'full', narrow: false, peek: false })).toBe(false);
        expect(isNavMini({ pref: 'mini', narrow: false, peek: false })).toBe(true);
    });

    it('should collapse automatically on a narrow window unless expanded for a peek', () => {
        expect(isNavMini({ pref: 'full', narrow: true, peek: false })).toBe(true);
        expect(isNavMini({ pref: 'mini', narrow: true, peek: true })).toBe(false);
    });

    it('should remember the choice in localStorage', () => {
        expect(readNavPref()).toBe('full');
        writeNavPref('mini');
        expect(localStorage.getItem(NAV_PREF_KEY)).toBe('mini');
        expect(readNavPref()).toBe('mini');
    });

    it('should ignore unknown stored values and storage that throws', () => {
        localStorage.setItem(NAV_PREF_KEY, 'weird');
        expect(readNavPref()).toBe('full');
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readNavPref()).toBe('full');
        expect(() => writeNavPref('mini')).not.toThrow();
    });
});
