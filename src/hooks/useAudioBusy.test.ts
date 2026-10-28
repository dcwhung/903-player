import { recording } from '../../tests/renderWithProviders';
import { isAudioBusy } from './useAudioBusy';

describe('isAudioBusy', () => {
    const loaded = recording('gongzi', '2026-10-17');

    it('is free when nothing is loaded', () => {
        expect(isAudioBusy(null, false)).toBe(false);
    });

    it('is busy while something is loaded, playing or paused', () => {
        expect(isAudioBusy(loaded, false)).toBe(true);
    });

    it('is free once the user has swiped the mini player away', () => {
        expect(isAudioBusy(loaded, true)).toBe(false);
    });
});
