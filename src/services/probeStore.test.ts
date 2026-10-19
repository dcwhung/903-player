import { PROBE_STORAGE_KEY, dateFromShowDateKey, readProbeState, showDateKey } from './probeStore';

describe('showDateKey / dateFromShowDateKey', () => {
    it('round-trips the date out of a key', () => {
        expect(dateFromShowDateKey(showDateKey('badgirl', '2026-10-19'))).toBe('2026-10-19');
    });

    it('returns an empty string for a malformed key', () => {
        expect(dateFromShowDateKey('badgirl')).toBe('');
    });
});

describe('readProbeState', () => {
    beforeEach(() => localStorage.clear());

    it('returns a fresh empty state each time so callers can mutate it safely', () => {
        const first = readProbeState();
        first.found.push({ showId: 'badgirl', date: '2026-10-19', time: '1009', url: 'x' });
        first.misses['badgirl:2026-10-19'] = 1;

        expect(readProbeState()).toEqual({ found: [], misses: {} });
    });

    it('returns a fresh empty state for corrupted storage', () => {
        localStorage.setItem(PROBE_STORAGE_KEY, '{not json');
        readProbeState().misses['a:b'] = 1;

        expect(readProbeState()).toEqual({ found: [], misses: {} });
    });
});
