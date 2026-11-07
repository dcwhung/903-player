import { miniPlayerMode } from './miniPlayerMode';

describe('miniPlayerMode', () => {
    it('should be single when there is one audio or none, so no dots space is reserved', () => {
        expect(miniPlayerMode(['/ep1.aac'])).toBe('single');
        expect(miniPlayerMode([])).toBe('single');
    });

    it('should be multi when there are several audios to swipe between', () => {
        expect(miniPlayerMode(['/a.aac', '/b.aac'])).toBe('multi');
    });
});
