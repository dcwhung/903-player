import { arcDashArray, pointToRatio, ratioToPoint } from './arc';

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
