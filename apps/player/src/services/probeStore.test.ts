import {
    PROBE_STORAGE_KEY,
    dateFromShowDateKey,
    readProbeState,
    showDateKey,
    showIdFromShowDateKey,
} from './probeStore';

describe('showDateKey / dateFromShowDateKey', () => {
    it('round-trips the date out of a key', () => {
        expect(dateFromShowDateKey(showDateKey('badgirl', '2026-10-19'))).toBe('2026-10-19');
    });

    it('returns an empty string for a malformed key', () => {
        expect(dateFromShowDateKey('badgirl')).toBe('');
    });

    it('round-trips the show id out of a key', () => {
        expect(showIdFromShowDateKey(showDateKey('badgirl', '2026-10-19'))).toBe('badgirl');
    });
});

describe('readProbeState', () => {
    beforeEach(() => localStorage.clear());

    it('returns a fresh empty state each time so callers can mutate it safely', () => {
        const first = readProbeState();
        first.found.push({
            showId: 'badgirl',
            id: 'show:badgirl:2026-10-19',
            date: '2026-10-19',
            time: '1009',
            url: 'x',
        });
        first.misses['badgirl:2026-10-19'] = 1;

        expect(readProbeState()).toEqual({ found: [], misses: {} });
    });

    it('returns a fresh empty state for corrupted storage', () => {
        localStorage.setItem(PROBE_STORAGE_KEY, '{not json');
        readProbeState().misses['a:b'] = 1;

        expect(readProbeState()).toEqual({ found: [], misses: {} });
    });

    it('fills in the episode id for recordings cached before episode ids existed', () => {
        const url =
            'https://audio.hkfm903.live/Bad%20Girl%E5%A4%A7%E9%81%8E%E4%BD%AC/20261019_1009_Bad_Girl%E5%A4%A7%E9%81%8E%E4%BD%AC.aac';
        const legacy = { showId: 'badgirl', date: '2026-10-19', time: '1009', url };
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify({ found: [legacy], misses: {} }));

        expect(readProbeState().found).toEqual([{ ...legacy, id: 'show:badgirl:2026-10-19' }]);
    });

    it('recomputes a stored id from the show and date instead of trusting it', () => {
        const url =
            'https://audio.hkfm903.live/Bad%20Girl%E5%A4%A7%E9%81%8E%E4%BD%AC/20261019_1009_Bad_Girl%E5%A4%A7%E9%81%8E%E4%BD%AC.aac';
        const stored = { showId: 'badgirl', date: '2026-10-19', time: '1009', url, id: 'x' };
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify({ found: [stored], misses: {} }));

        expect(readProbeState().found[0]?.id).toBe('show:badgirl:2026-10-19');
    });
});
