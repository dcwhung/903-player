import { placeTooltip, type Box } from './tooltipPlacement';

const rect = (left: number, top: number, width: number, height: number): Box => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
});

const BOUNDS = rect(0, 0, 1000, 800);
const TIP = { width: 200, height: 40 };

describe('placeTooltip', () => {
    it('should centre a top tooltip above the anchor with the arrow in the middle', () => {
        const place = placeTooltip(rect(400, 300, 20, 20), TIP, BOUNDS, 'top');
        expect(place).toEqual({ side: 'top', x: 310, y: 250, arrow: 100 });
    });

    it('should flip to the bottom when there is no room above', () => {
        const place = placeTooltip(rect(400, 20, 20, 20), TIP, BOUNDS, 'top');
        expect(place.side).toBe('bottom');
        expect(place.y).toBe(50);
    });

    it('should slide inside the left bound (e.g. the nav edge) and keep the arrow on the anchor', () => {
        const navEdge = { ...BOUNDS, left: 232 };
        const place = placeTooltip(rect(240, 300, 20, 20), TIP, navEdge, 'top');
        expect(place.x).toBe(240);
        expect(place.arrow).toBe(12);
    });

    it('should slide inside the right edge of the viewport', () => {
        const place = placeTooltip(rect(980, 300, 16, 16), TIP, BOUNDS, 'top');
        expect(place.x).toBe(BOUNDS.right - 8 - TIP.width);
        expect(place.arrow).toBe(TIP.width - 12);
    });

    it('should place a right tooltip beside the anchor and flip left when it would overflow', () => {
        expect(placeTooltip(rect(20, 100, 36, 36), TIP, BOUNDS, 'right')).toEqual({
            side: 'right',
            x: 66,
            y: 98,
            arrow: 20,
        });
        expect(placeTooltip(rect(900, 100, 36, 36), TIP, BOUNDS, 'right').side).toBe('left');
    });
});
