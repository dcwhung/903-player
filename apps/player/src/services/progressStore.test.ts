import { PROGRESS_STORAGE_KEY, PROGRESS_V1_STORAGE_KEY } from '../config/constants';
import {
    getProgress,
    getResumePosition,
    getProgressMap,
    getWatchedIds,
    isWatched,
    mergeProgress,
    readLegacyProgress,
    resetWatched,
    saveProgress,
} from './progressStore';

const ID_A = 'show:badgirl:2026-10-19';
const DURATION = 1000;

describe('progressStore', () => {
    it('returns undefined when nothing is saved', () => {
        expect(getProgress(ID_A)).toBeUndefined();
        expect(getResumePosition(ID_A)).toBe(0);
        expect(isWatched(ID_A)).toBe(false);
    });

    it('saves and resumes a partial position', () => {
        saveProgress(ID_A, 300, DURATION);

        expect(getProgress(ID_A)).toMatchObject({
            position: 300,
            duration: DURATION,
            watched: false,
        });
        expect(getResumePosition(ID_A)).toBe(300);
    });

    it('marks watched at 95% and restarts from the beginning next time', () => {
        saveProgress(ID_A, 950, DURATION);

        expect(isWatched(ID_A)).toBe(true);
        expect(getResumePosition(ID_A)).toBe(0);
    });

    it('keeps watched once reached, even after seeking back', () => {
        saveProgress(ID_A, 960, DURATION);
        saveProgress(ID_A, 10, DURATION);

        expect(isWatched(ID_A)).toBe(true);
    });

    it('clears watched and saves the replay position when reset', () => {
        saveProgress(ID_A, 960, DURATION);

        resetWatched(ID_A, 10, DURATION);

        expect(getProgress(ID_A)).toMatchObject({ position: 10, watched: false });
        expect(getResumePosition(ID_A)).toBe(10);
    });

    it('marks watched again after a reset once 95% is reached', () => {
        saveProgress(ID_A, 960, DURATION);
        resetWatched(ID_A, 10, DURATION);

        saveProgress(ID_A, 500, DURATION);
        expect(isWatched(ID_A)).toBe(false);

        saveProgress(ID_A, 950, DURATION);
        expect(isWatched(ID_A)).toBe(true);
    });

    it('ignores unknown duration when deciding watched', () => {
        saveProgress(ID_A, 10, Number.NaN);

        expect(isWatched(ID_A)).toBe(false);
    });

    it('lists watched ids in a single read', () => {
        saveProgress(ID_A, 960, DURATION);
        saveProgress('show:badgirl:2026-10-20', 10, DURATION);
        const spy = vi.spyOn(Storage.prototype, 'getItem');

        expect(getWatchedIds()).toEqual(new Set([ID_A]));
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    it('returns every saved progress in a single read', () => {
        saveProgress(ID_A, 300, DURATION);

        expect(getProgressMap()[ID_A]).toMatchObject({ position: 300, watched: false });
    });

    it('survives corrupted storage data', () => {
        localStorage.setItem(PROGRESS_STORAGE_KEY, '{not json');

        expect(getProgress(ID_A)).toBeUndefined();
        expect(() => saveProgress(ID_A, 1, DURATION)).not.toThrow();
    });

    it('drops entries with an invalid shape', () => {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ [ID_A]: { position: 'x' } }));

        expect(getProgress(ID_A)).toBeUndefined();
    });

    it('does not throw when storage is unavailable', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });

        expect(() => saveProgress(ID_A, 1, DURATION)).not.toThrow();
        spy.mockRestore();
    });

    it('stores progress under the v2 key keyed by episode id, leaving v1 alone', () => {
        localStorage.setItem(PROGRESS_V1_STORAGE_KEY, '{"keep":"me"}');
        saveProgress(ID_A, 300, DURATION);

        expect(PROGRESS_STORAGE_KEY).toBe('903player:progress:v2');
        expect(Object.keys(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}'))).toEqual(
            [ID_A],
        );
        expect(localStorage.getItem(PROGRESS_V1_STORAGE_KEY)).toBe('{"keep":"me"}');
    });
});

describe('progressStore migration helpers', () => {
    const SAVED = { position: 300, duration: DURATION, watched: false, updatedAt: 1 };

    it('reads the legacy v1 map (url keys), dropping broken entries', () => {
        localStorage.setItem(
            PROGRESS_V1_STORAGE_KEY,
            JSON.stringify({ 'https://a/x.aac': SAVED, 'https://a/y.aac': { position: 'x' } }),
        );

        expect(readLegacyProgress()).toEqual({ 'https://a/x.aac': SAVED });
    });

    it('reads an empty legacy map when v1 is missing or broken', () => {
        expect(readLegacyProgress()).toEqual({});
        localStorage.setItem(PROGRESS_V1_STORAGE_KEY, '{not json');
        expect(readLegacyProgress()).toEqual({});
    });

    it('merges new ids without overwriting ids already in v2', () => {
        saveProgress(ID_A, 10, DURATION);

        const added = mergeProgress({ [ID_A]: SAVED, 'show:badgirl:2026-10-20': SAVED });

        expect(added).toBe(1);
        expect(getProgress(ID_A)?.position).toBe(10);
        expect(getProgress('show:badgirl:2026-10-20')).toEqual(SAVED);
    });

    it('does not write when nothing new is merged', () => {
        saveProgress(ID_A, 10, DURATION);
        const spy = vi.spyOn(Storage.prototype, 'setItem');

        expect(mergeProgress({ [ID_A]: SAVED })).toBe(0);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
