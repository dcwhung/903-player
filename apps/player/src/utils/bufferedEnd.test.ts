import { timeRanges } from '../../tests/fakeAudio';
import { bufferedEnd } from './bufferedEnd';

const media = (currentTime: number, buffered?: TimeRanges): HTMLMediaElement =>
    ({ currentTime, buffered }) as unknown as HTMLMediaElement;

describe('bufferedEnd', () => {
    it('should return the end of the range around the current position', () => {
        const ranges = timeRanges([
            [0, 50],
            [100, 200],
        ]);

        expect(bufferedEnd(media(120, ranges))).toBe(200);
    });

    it('should return undefined when the current position is not buffered', () => {
        expect(bufferedEnd(media(60, timeRanges([[0, 50]])))).toBeUndefined();
    });

    it('should return undefined when the element has no buffered ranges', () => {
        expect(bufferedEnd(media(0))).toBeUndefined();
    });
});
