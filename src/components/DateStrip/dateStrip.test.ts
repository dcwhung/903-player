import { recording } from '../../../tests/renderWithProviders';
import {
    behindTurn,
    rotationOf,
    steppedDay,
    stripDays,
    stripOffset,
    stripRelease,
    trackTransform,
    uprightSpin,
} from './dateStrip';

const EPISODES = [
    recording('badgirl', '2026-10-21'),
    recording('badgirl', '2026-10-20'),
    recording('badgirl', '2026-10-19'),
    recording('badgirl', '2026-10-16'),
    recording('badgirl', '2026-10-15'),
];
const urlOn = (date: string) => EPISODES.find((r) => r.date === date)?.url;
// 7 格 × 50px
const WIDTH = 350;
const CELL = 50;
// 新一集喺左：24/10（留空）… 21/10 = 3、19/10 = 5、18–17/10 冇節目、16/10 = 8、15/10 = 9 … 12/10（留空）
const { days } = stripDays(EPISODES, urlOn('2026-10-19'));
const ON_19 = 5;
const ON_16 = 8;

describe('stripDays', () => {
    it('lists every calendar day newest first, padded by three blank days at each end', () => {
        expect(days.map((d) => d.date)).toEqual([
            '2026-10-24',
            '2026-10-23',
            '2026-10-22',
            '2026-10-21',
            '2026-10-20',
            '2026-10-19',
            '2026-10-18',
            '2026-10-17',
            '2026-10-16',
            '2026-10-15',
            '2026-10-14',
            '2026-10-13',
            '2026-10-12',
        ]);
        expect(days.map((d) => d.inRange)).toEqual([
            ...[false, false, false],
            ...[true, true, true, true, true, true, true],
            ...[false, false, false],
        ]);
    });

    it('links each day that has an episode and centres the current one', () => {
        const result = stripDays(EPISODES, urlOn('2026-10-19'));

        expect(result.current).toBe(ON_19);
        expect(result.days[ON_19]?.url).toBe(urlOn('2026-10-19'));
        expect(result.days[6]?.url).toBeNull();
        expect(result.days[0]?.url).toBeNull();
    });

    it('falls back to the newest episode when the current one is not listed', () => {
        expect(stripDays(EPISODES, 'missing').current).toBe(3);
        expect(stripDays([], undefined)).toEqual({ days: [], current: -1 });
    });

    it('keeps the newest episode of a day that has two and still centres the other one', () => {
        const late = recording('badgirl', '2026-10-20', '2308');
        const early = recording('badgirl', '2026-10-20', '1009');
        const result = stripDays([late, early], early.url);

        expect(result.days[result.current]?.url).toBe(late.url);
        expect(result.days[result.current]?.date).toBe('2026-10-20');
    });
});

describe('stripDays for a weekly show', () => {
    const SATURDAYS = [
        recording('gongzi', '2026-10-17'),
        recording('gongzi', '2026-10-10'),
        recording('gongzi', '2026-10-03'),
    ];

    it('lists only the days with an episode, still padded by three blank days at each end', () => {
        const weekly = stripDays(SATURDAYS, SATURDAYS[1]?.url, { episodeDaysOnly: true });

        expect(weekly.days.map((d) => (d.inRange ? d.date : ''))).toEqual([
            ...['', '', ''],
            ...['2026-10-17', '2026-10-10', '2026-10-03'],
            ...['', '', ''],
        ]);
        expect(weekly.days.filter((d) => d.inRange).every((d) => d.url !== null)).toBe(true);
        expect(weekly.days.filter((d) => !d.inRange).every((d) => d.url === null)).toBe(true);
        expect(weekly.current).toBe(4);
        // React key 用日期：留空嗰幾格都唔可以撞
        expect(new Set(weekly.days.map((d) => d.date)).size).toBe(weekly.days.length);
    });

    it('moves one episode per cell when dragged', () => {
        const weekly = stripDays(SATURDAYS, SATURDAYS[0]?.url, { episodeDaysOnly: true });
        const drag = { dx: -2 * CELL, dy: 0, ms: 400, width: WIDTH };

        expect(stripRelease(drag, weekly.days, weekly.current)).toBe(5);
    });
});

describe('stripRelease', () => {
    const release = (dx: number, ms = 400, dy = 0, width = WIDTH) => ({ dx, dy, ms, width });
    const at = (current: number, dx: number, ms?: number) =>
        stripRelease(release(dx, ms), days, current);

    it('lands on the episode nearest to where the strip was let go', () => {
        // 拖兩格（-100px）：17/10 冇節目，最近係 16/10
        expect(at(ON_19, -100)).toBe(ON_16);
        // 拖一格（-50px）：18/10 冇節目，最近係返 19/10
        expect(at(ON_19, -50)).toBe(ON_19);
        // 拖三格（+150px）去咗 22/10（留空）：最近係最新一集 21/10
        expect(at(ON_19, 150)).toBe(3);
    });

    it('springs back to the current day from a short slow drag', () => {
        expect(at(ON_19, -20)).toBe(ON_19);
    });

    it('breaks a tie towards the direction of the drag', () => {
        const gap = stripDays(
            [recording('badgirl', '2026-10-21'), recording('badgirl', '2026-10-19')],
            undefined,
        );
        // 21/10（3）向左拖一格去 20/10（冇節目）：19/10 同 21/10 一樣近，跟拖動方向揀舊嗰集
        expect(stripRelease(release(-50), gap.days, gap.current)).toBe(5);
    });

    it('breaks a tie towards the drag direction across a wide gap too', () => {
        const wide = stripDays(
            [
                recording('badgirl', '2026-10-20'),
                recording('badgirl', '2026-10-16'),
                recording('badgirl', '2026-10-12'),
            ],
            recording('badgirl', '2026-10-16').url,
        );
        // 16/10（7）向左拖兩格去 14/10：16/10 同 12/10 都隔兩格，跟拖動方向揀 12/10（11）
        expect(stripRelease(release(-2 * CELL), wide.days, wide.current)).toBe(11);
        expect(stripRelease(release(2 * CELL), wide.days, wide.current)).toBe(3);
    });

    it('moves at least one episode on a quick flick', () => {
        expect(at(ON_19, -30, 40)).toBe(ON_16);
        expect(at(ON_19, 30, 40)).toBe(4);
    });

    it('ignores mostly vertical movement and tiny twitches', () => {
        expect(stripRelease(release(-60, 400, 90), days, ON_19)).toBeNull();
        expect(at(ON_19, -4, 1)).toBeNull();
    });

    it('measures cells with a fallback width before the strip is laid out', () => {
        // 未量到闊度用 56px 一格：拖 -112px = 兩格
        expect(stripRelease(release(-112, 400, 0, 0), days, ON_19)).toBe(ON_16);
    });
});

describe('stripOffset', () => {
    it('follows the finger between the newest and oldest episodes', () => {
        expect(stripOffset(-100, days, ON_19, CELL)).toBe(-100);
        expect(stripOffset(100, days, ON_19, CELL)).toBe(100);
    });

    it('resists a drag past the newest or oldest episode', () => {
        expect(stripOffset(100, days, 3, CELL)).toBeLessThan(100);
        expect(stripOffset(100, days, 3, CELL)).toBeGreaterThan(0);
        expect(stripOffset(-100, days, 9, CELL)).toBeGreaterThan(-100);
        // 未去到盡頭嗰段照跟手指，之後先加阻力
        expect(stripOffset(-200, days, ON_19, CELL)).toBeLessThan(-200 + CELL);
    });
});

describe('trackTransform', () => {
    it('puts the current day in the middle of seven cells and adds the drag', () => {
        expect(trackTransform(ON_19, 0)).toBe('translateX(calc(-2 * 100% / 7 + 0px))');
        expect(trackTransform(3, -20)).toBe('translateX(calc(0 * 100% / 7 + -20px))');
    });
});

describe('steppedDay', () => {
    it('steps to the next episode left (newer) or right (older), skipping empty days', () => {
        expect(steppedDay(days, ON_19, 'next')).toBe(ON_16);
        expect(steppedDay(days, ON_19, 'previous')).toBe(4);
    });

    it('stays put at either end', () => {
        expect(steppedDay(days, 3, 'previous')).toBe(3);
        expect(steppedDay(days, 9, 'next')).toBe(9);
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
