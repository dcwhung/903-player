import { arcDashArray, isOnArcBand, pointToRatio, ratioToPoint, stabiliseDragRatio } from './arc';

const CENTER = 150;
const RADIUS = 140;

const near = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 3);

describe('ratioToPoint', () => {
    it('starts at the bottom-left (135°)', () => {
        const { x, y } = ratioToPoint(0, CENTER, RADIUS);
        near(x, CENTER - RADIUS * Math.SQRT1_2);
        near(y, CENTER + RADIUS * Math.SQRT1_2);
    });

    it('is at the top centre halfway through', () => {
        const { x, y } = ratioToPoint(0.5, CENTER, RADIUS);
        near(x, CENTER);
        near(y, CENTER - RADIUS);
    });

    it('clamps ratios outside 0–1', () => {
        expect(ratioToPoint(2, CENTER, RADIUS)).toEqual(ratioToPoint(1, CENTER, RADIUS));
        expect(ratioToPoint(-1, CENTER, RADIUS)).toEqual(ratioToPoint(0, CENTER, RADIUS));
    });
});

describe('pointToRatio', () => {
    it('maps the top centre to 0.5', () => {
        near(pointToRatio(CENTER, 10, CENTER), 0.5);
    });

    it('maps the far left to one sixth', () => {
        near(pointToRatio(10, CENTER, CENTER), 1 / 6);
    });

    it('maps the far right to five sixths', () => {
        near(pointToRatio(290, CENTER, CENTER), 5 / 6);
    });

    it('snaps the bottom gap to the nearest end', () => {
        expect(pointToRatio(CENTER - 1, 290, CENTER)).toBe(0);
        expect(pointToRatio(CENTER + 1, 290, CENTER)).toBe(1);
    });

    it('round-trips with ratioToPoint', () => {
        const { x, y } = ratioToPoint(0.42, CENTER, RADIUS);
        near(pointToRatio(x, y, CENTER), 0.42);
    });
});

describe('arcDashArray', () => {
    it('covers the full 270° track at ratio 1', () => {
        const circumference = 2 * Math.PI * RADIUS;
        const [visible, total] = arcDashArray(1, RADIUS).split(' ').map(Number);
        near(visible ?? 0, circumference * 0.75);
        near(total ?? 0, circumference);
    });

    it('is empty at ratio 0', () => {
        expect(arcDashArray(0, RADIUS).startsWith('0 ')).toBe(true);
    });
});

describe('stabiliseDragRatio', () => {
    it('passes through the first sample of a drag', () => {
        expect(stabiliseDragRatio(0, null)).toBe(0);
        expect(stabiliseDragRatio(1, null)).toBe(1);
    });

    it('keeps the end when a drag near the end crosses the gap', () => {
        expect(stabiliseDragRatio(0, 0.97)).toBe(1);
    });

    it('keeps the start when a drag near the start crosses the gap', () => {
        expect(stabiliseDragRatio(1, 0.03)).toBe(0);
    });

    it('passes through normal movement', () => {
        expect(stabiliseDragRatio(0.4, 0.42)).toBe(0.4);
        expect(stabiliseDragRatio(1, 0.98)).toBe(1);
    });
});

describe('isOnArcBand', () => {
    const BAND = { inner: 112, outer: 168, gapTolerance: 12 };
    const at = (degrees: number, radius: number) => {
        const radians = (degrees * Math.PI) / 180;
        return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)] as const;
    };
    const onBand = (degrees: number, radius: number) =>
        isOnArcBand(...at(degrees, radius), CENTER, BAND);

    it('accepts points on the ring within the band width', () => {
        expect(onBand(270, RADIUS)).toBe(true);
        expect(onBand(270, 113)).toBe(true);
        expect(onBand(270, 167)).toBe(true);
    });

    it('rejects points inside the disc or outside the band', () => {
        expect(onBand(270, 100)).toBe(false);
        expect(onBand(270, 180)).toBe(false);
        // 唱片格四角
        expect(isOnArcBand(5, 5, CENTER, BAND)).toBe(false);
    });

    it('rejects the bottom gap but keeps a tolerance next to both ends', () => {
        expect(onBand(90, RADIUS)).toBe(false);
        expect(onBand(130, RADIUS)).toBe(true);
        expect(onBand(50, RADIUS)).toBe(true);
        expect(onBand(120, RADIUS)).toBe(false);
        expect(onBand(60, RADIUS)).toBe(false);
    });

    it('rejects points that cannot be measured', () => {
        expect(isOnArcBand(Number.NaN, Number.NaN, CENTER, BAND)).toBe(false);
    });
});
