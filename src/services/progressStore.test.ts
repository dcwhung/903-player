import { PROGRESS_STORAGE_KEY } from '../config/constants';
import {
    getProgress,
    getResumePosition,
    getWatchedUrls,
    isWatched,
    saveProgress,
} from './progressStore';

const URL_A = 'https://audio.hkfm903.live/a.aac';
const DURATION = 1000;

describe('progressStore', () => {
    it('returns undefined when nothing is saved', () => {
        expect(getProgress(URL_A)).toBeUndefined();
        expect(getResumePosition(URL_A)).toBe(0);
        expect(isWatched(URL_A)).toBe(false);
    });

    it('saves and resumes a partial position', () => {
        saveProgress(URL_A, 300, DURATION);

        expect(getProgress(URL_A)).toMatchObject({
            position: 300,
            duration: DURATION,
            watched: false,
        });
        expect(getResumePosition(URL_A)).toBe(300);
    });

    it('marks watched at 95% and restarts from the beginning next time', () => {
        saveProgress(URL_A, 950, DURATION);

        expect(isWatched(URL_A)).toBe(true);
        expect(getResumePosition(URL_A)).toBe(0);
    });

    it('keeps watched once reached, even after seeking back', () => {
        saveProgress(URL_A, 960, DURATION);
        saveProgress(URL_A, 10, DURATION);

        expect(isWatched(URL_A)).toBe(true);
    });

    it('ignores unknown duration when deciding watched', () => {
        saveProgress(URL_A, 10, Number.NaN);

        expect(isWatched(URL_A)).toBe(false);
    });

    it('lists watched urls in a single read', () => {
        saveProgress(URL_A, 960, DURATION);
        saveProgress('https://audio.hkfm903.live/b.aac', 10, DURATION);
        const spy = vi.spyOn(Storage.prototype, 'getItem');

        expect(getWatchedUrls()).toEqual(new Set([URL_A]));
        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    it('survives corrupted storage data', () => {
        localStorage.setItem(PROGRESS_STORAGE_KEY, '{not json');

        expect(getProgress(URL_A)).toBeUndefined();
        expect(() => saveProgress(URL_A, 1, DURATION)).not.toThrow();
    });

    it('drops entries with an invalid shape', () => {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ [URL_A]: { position: 'x' } }));

        expect(getProgress(URL_A)).toBeUndefined();
    });

    it('does not throw when storage is unavailable', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });

        expect(() => saveProgress(URL_A, 1, DURATION)).not.toThrow();
        spy.mockRestore();
    });
});
