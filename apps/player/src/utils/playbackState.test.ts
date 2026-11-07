import { playbackStateOf } from './playbackState';

describe('playbackStateOf', () => {
    it('is playing whenever the player plays, even at 0:00', () => {
        expect(playbackStateOf({ isPlaying: true, position: 0 })).toBe('playing');
    });

    it('is paused when stopped part way through', () => {
        expect(playbackStateOf({ isPlaying: false, position: 5 })).toBe('paused');
    });

    it('is ready when loaded but not started', () => {
        expect(playbackStateOf({ isPlaying: false, position: 0 })).toBe('ready');
    });
});
