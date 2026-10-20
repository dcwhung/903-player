import { recording } from '../../../tests/renderWithProviders';
import {
    sideCellChevron,
    sideCellLabel,
    stripNeighbours,
    stripOffset,
    stripRelease,
    stripShift,
    behindTurn,
    rotationOf,
    uprightSpin,
} from './dateStrip';

const EPISODES = [
    recording('badgirl', '2026-10-19'),
    recording('badgirl', '2026-10-16'),
    recording('badgirl', '2026-10-15'),
];
const BOTH = { newer: '19/10（一）', older: '15/10（四）' };
const WIDTH = 400;

describe('stripNeighbours', () => {
    it('labels the newer and older neighbours of the current episode', () => {
        expect(stripNeighbours(EPISODES, EPISODES[1]?.url)).toEqual(BOTH);
    });

    it('leaves the missing side empty at either end', () => {
        expect(stripNeighbours(EPISODES, EPISODES[0]?.url)).toEqual({ older: '16/10（五）' });
        expect(stripNeighbours(EPISODES, EPISODES[2]?.url)).toEqual({ newer: '16/10（五）' });
        expect(stripNeighbours(EPISODES, 'missing')).toEqual({});
    });
});

describe('side cells', () => {
    it('points the newer cell left and the older cell right', () => {
        expect(sideCellChevron('previous')).toBe('‹');
        expect(sideCellChevron('next')).toBe('›');
    });

    it('names each side cell after the episode it plays', () => {
        expect(sideCellLabel('previous', '19/10（一）')).toBe('新一集 19/10（一）');
        expect(sideCellLabel('next', '15/10（四）')).toBe('舊一集 15/10（四）');
    });
});

describe('stripRelease', () => {
    const release = (dx: number, ms = 400, dy = 0) => ({ dx, dy, ms, width: WIDTH });

    it('commits a left drag past half a side cell to the older episode', () => {
        // 側格 = 25% × 400 = 100px，過一半（50px）就轉
        expect(stripRelease(release(-60), BOTH)).toEqual({ direction: 'next', commit: true });
        expect(stripRelease(release(60), BOTH)).toEqual({ direction: 'previous', commit: true });
    });

    it('springs back from a short slow drag', () => {
        expect(stripRelease(release(-40), BOTH)).toEqual({ direction: null, commit: false });
    });

    it('commits a short fast flick', () => {
        expect(stripRelease(release(-30, 40), BOTH)).toEqual({ direction: 'next', commit: true });
    });

    it('ignores mostly vertical movement and tiny twitches', () => {
        expect(stripRelease(release(-60, 400, 90), BOTH).direction).toBeNull();
        expect(stripRelease(release(-8, 1), BOTH).direction).toBeNull();
    });

    it('does not commit towards a missing neighbour at either end', () => {
        expect(stripRelease(release(-80), { newer: '19/10（一）' })).toEqual({
            direction: 'next',
            commit: false,
        });
        expect(stripRelease(release(80), { older: '15/10（四）' })).toEqual({
            direction: 'previous',
            commit: false,
        });
    });

    it('falls back to the swipe threshold before the strip is measured', () => {
        const unmeasured = (dx: number) => ({ dx, dy: 0, ms: 400, width: 0 });
        expect(stripRelease(unmeasured(-47), BOTH).direction).toBeNull();
        expect(stripRelease(unmeasured(-48), BOTH).direction).toBe('next');
    });
});

describe('stripOffset', () => {
    it('follows the finger towards an existing neighbour', () => {
        expect(stripOffset(-50, BOTH)).toBe(-50);
        expect(stripOffset(50, BOTH)).toBe(50);
    });

    it('resists a drag towards a missing neighbour', () => {
        expect(Math.abs(stripOffset(-50, { newer: '19/10（一）' }))).toBeLessThan(50);
        expect(Math.abs(stripOffset(50, { older: '15/10（四）' }))).toBeLessThan(50);
    });
});

describe('stripShift', () => {
    it('moves a side cell into the centre on commit', () => {
        // 中格中心去側格中心 = (50% + 25%) / 2
        expect(stripShift(WIDTH, 'next')).toBe(-150);
        expect(stripShift(WIDTH, 'previous')).toBe(150);
    });
});

describe('uprightSpin', () => {
    it('turns clockwise to the next upright angle, at least half a turn away', () => {
        expect(uprightSpin(0)).toBe(360);
        expect(uprightSpin(-50)).toBe(360);
        expect(uprightSpin(170)).toBe(360);
        expect(uprightSpin(200)).toBe(720);
        expect(uprightSpin(360)).toBe(720);
    });

    it('always lands on a whole turn so the art reads upright', () => {
        [-400, -90, 0, 45, 359, 1000].forEach((deg) => {
            const target = uprightSpin(deg);
            expect(target % 360 === 0).toBe(true);
            expect(target).toBeGreaterThan(deg);
        });
    });
});

describe('rotationOf', () => {
    it('reads the angle of a computed 2D or 3D rotation matrix', () => {
        expect(rotationOf('matrix(0, 1, -1, 0, 0, 0)')).toBeCloseTo(90);
        expect(rotationOf('matrix(-1, 0, 0, -1, 0, 0)')).toBeCloseTo(180);
        expect(rotationOf('matrix3d(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)')).toBeCloseTo(
            -90,
        );
    });

    it('gives null without a readable transform', () => {
        expect(rotationOf('none')).toBeNull();
        expect(rotationOf('')).toBeNull();
    });
});

describe('behindTurn', () => {
    it('picks the same visual angle at or less than one turn behind the target', () => {
        expect(behindTurn(90, 720)).toBe(450);
        expect(behindTurn(-90, 720)).toBe(630);
        expect(behindTurn(0, 360)).toBe(360);
        expect(behindTurn(170, -170)).toBe(-190);
    });
});
