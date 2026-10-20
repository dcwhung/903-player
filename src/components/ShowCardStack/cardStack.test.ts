import { SWIPE_THRESHOLD_PX } from '../../hooks/swipe';
import {
    COMMIT_DISTANCE_RATIO,
    FLICK_VELOCITY_PX_PER_MS,
    MAX_ROTATE_DEG,
    ROTATE_DIVISOR_PX,
    VELOCITY_WINDOW_MS,
    cardRotation,
    dragProgress,
    isOnPageDot,
    pushSample,
    releaseDirection,
    stackSlots,
    translateXOf,
    velocityOf,
} from './cardStack';

const WIDTH = 300;
const COMMIT_PX = WIDTH * COMMIT_DISTANCE_RATIO;
const FLICK_PX = SWIPE_THRESHOLD_PX + 10;

describe('releaseDirection', () => {
    it('should commit when the drag passes the distance threshold', () => {
        expect(releaseDirection(-COMMIT_PX, 0, WIDTH)).toBe('next');
        expect(releaseDirection(COMMIT_PX + 1, 0, WIDTH)).toBe('previous');
    });

    it('should spring back when the drag is short and slow', () => {
        expect(releaseDirection(-(COMMIT_PX - 1), 0, WIDTH)).toBeNull();
        expect(releaseDirection(0, 0, WIDTH)).toBeNull();
    });

    it('should commit a short but fast flick in the drag direction', () => {
        expect(releaseDirection(-FLICK_PX, -FLICK_VELOCITY_PX_PER_MS, WIDTH)).toBe('next');
        expect(releaseDirection(FLICK_PX, FLICK_VELOCITY_PX_PER_MS * 2, WIDTH)).toBe('previous');
    });

    it('should not commit a flick that goes against the drag or is barely a drag', () => {
        expect(releaseDirection(-FLICK_PX, FLICK_VELOCITY_PX_PER_MS * 2, WIDTH)).toBeNull();
        expect(releaseDirection(-20, -FLICK_VELOCITY_PX_PER_MS * 2, WIDTH)).toBeNull();
    });

    it('should not drop below the plain swipe threshold when the width is unknown', () => {
        expect(releaseDirection(-(SWIPE_THRESHOLD_PX - 1), 0, 0)).toBeNull();
        expect(releaseDirection(-SWIPE_THRESHOLD_PX, 0, 0)).toBe('next');
    });
});

describe('cardRotation', () => {
    it('should rotate in proportion to the drag', () => {
        expect(cardRotation(ROTATE_DIVISOR_PX * 3)).toBe(3);
        expect(cardRotation(-ROTATE_DIVISOR_PX * 2)).toBe(-2);
        expect(cardRotation(0)).toBe(0);
    });

    it('should cap the rotation', () => {
        expect(cardRotation(10_000)).toBe(MAX_ROTATE_DEG);
        expect(cardRotation(-10_000)).toBe(-MAX_ROTATE_DEG);
    });
});

describe('dragProgress', () => {
    it('should grow with the drag and stop at 1 at the commit threshold', () => {
        expect(dragProgress(-COMMIT_PX / 2, WIDTH)).toBeCloseTo(0.5);
        expect(dragProgress(COMMIT_PX * 3, WIDTH)).toBe(1);
    });
});

describe('stackSlots', () => {
    it('should stack the next two shows behind and keep the previous one ready', () => {
        expect(stackSlots(2, 4)).toEqual({ behind: [3, 0], incoming: 1 });
        expect(stackSlots(0, 3)).toEqual({ behind: [1, 2], incoming: 2 });
    });

    it('should not repeat the current show behind itself', () => {
        expect(stackSlots(0, 2)).toEqual({ behind: [1], incoming: 1 });
        expect(stackSlots(0, 1)).toEqual({ behind: [], incoming: null });
    });
});

describe('isOnPageDot', () => {
    it('should spot a target inside a page dot, but not elsewhere', () => {
        const dot = document.createElement('button');
        dot.dataset.pageDot = '';
        const inner = dot.appendChild(document.createElement('span'));

        expect(isOnPageDot(dot)).toBe(true);
        expect(isOnPageDot(inner)).toBe(true);
        expect(isOnPageDot(document.createElement('button'))).toBe(false);
        expect(isOnPageDot(null)).toBe(false);
    });
});

describe('translateXOf', () => {
    it('should read the horizontal offset of a computed 2D transform', () => {
        expect(translateXOf('matrix(0.99, -0.1, 0.1, 0.99, -42.5, 3)')).toBe(-42.5);
    });

    it('should read the horizontal offset of a computed 3D transform', () => {
        expect(translateXOf('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 37, -4, 0, 1)')).toBe(37);
    });

    it('should be 0 when there is no transform', () => {
        expect(translateXOf('none')).toBe(0);
        expect(translateXOf('')).toBe(0);
    });
});

describe('velocityOf', () => {
    it('should measure the speed over the recent samples', () => {
        let samples = pushSample([], { x: 0, t: 0 });
        samples = pushSample(samples, { x: -30, t: 20 });
        samples = pushSample(samples, { x: -60, t: 40 });

        expect(velocityOf(samples)).toBeCloseTo(-1.5);
    });

    it('should forget samples older than the window, so a pause before release is slow', () => {
        let samples = pushSample([], { x: 0, t: 0 });
        samples = pushSample(samples, { x: -100, t: 20 });
        samples = pushSample(samples, { x: -100, t: 20 + VELOCITY_WINDOW_MS + 1 });

        expect(velocityOf(samples)).toBe(0);
    });

    it('should be zero without elapsed time', () => {
        expect(velocityOf(pushSample([], { x: 5, t: 0 }))).toBe(0);
    });
});
