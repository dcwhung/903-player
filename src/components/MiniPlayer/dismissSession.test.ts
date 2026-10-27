import {
    REST,
    SESSION_REST,
    armIdle,
    dismiss,
    dropPress,
    lift,
    newSession,
    releaseArmed,
    settleBack,
    sync,
    takePress,
    type Press,
    type Session,
} from './dismissSession';
import {
    ARMED_IDLE_MS,
    DISMISS_RATIO,
    DISMISS_SLIDE_MS,
    LONG_PRESS_MS,
    REVEAL_MIN_PX,
    REVEAL_PX,
} from './miniPlayerDismiss';

const WIDTH = 360;
const POINTER_ID = 1;
const OTHER_POINTER_ID = 2;
const ONE_MS = 1;
const ONE_PX = 1;
const ZERO_MS = 0;
const DISMISS_OFFSET = WIDTH * DISMISS_RATIO;
const REVEAL_OFFSET = REVEAL_MIN_PX;
const COLLAPSE_OFFSET = REVEAL_MIN_PX - ONE_PX;

const makePress = (overrides: Partial<Press> = {}): Press => ({
    pointerId: POINTER_ID,
    x: 0,
    y: 0,
    from: 0,
    width: WIDTH,
    dragging: false,
    liftedNow: false,
    ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
    ...newSession(),
    ...overrides,
});

const stubReducedMotion = (matches: boolean) =>
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches })),
    );

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('newSession', () => {
    it('should start at rest with no press and not closing', () => {
        expect(newSession()).toEqual({ ...SESSION_REST, press: null, closing: false });
    });
});

describe('sync', () => {
    it('should push the rest view when the session is at rest', () => {
        const setView = vi.fn();
        sync(newSession(), setView);
        expect(setView).toHaveBeenCalledWith(REST);
    });

    it('should report dragging from the current press', () => {
        const setView = vi.fn();
        sync(makeSession({ armed: true, press: makePress({ dragging: true }) }), setView);
        expect(setView).toHaveBeenCalledWith({ ...REST, armed: true, dragging: true });
    });
});

describe('settleBack', () => {
    it('should reset an armed, revealed session back to rest', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true, revealed: true, offset: REVEAL_PX });
        settleBack(session, setView);
        expect(session).toMatchObject(SESSION_REST);
        expect(setView).toHaveBeenCalledWith(REST);
    });

    it('should do nothing when a finger is still down', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true, press: makePress() });
        settleBack(session, setView);
        expect(session.armed).toBe(true);
        expect(setView).not.toHaveBeenCalled();
    });

    it('should do nothing while the card is sliding away', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true, closing: true, offset: WIDTH });
        settleBack(session, setView);
        expect(session.offset).toBe(WIDTH);
        expect(setView).not.toHaveBeenCalled();
    });

    it('should cancel a pending idle timer', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true });
        armIdle(session, setView);
        settleBack(session, setView);
        vi.advanceTimersByTime(ARMED_IDLE_MS);
        expect(setView).toHaveBeenCalledTimes(1);
    });
});

describe('armIdle', () => {
    it('should settle back after the idle time with no movement', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true });
        armIdle(session, setView);
        vi.advanceTimersByTime(ARMED_IDLE_MS - ONE_MS);
        expect(session.armed).toBe(true);
        vi.advanceTimersByTime(ONE_MS);
        expect(session.armed).toBe(false);
        expect(setView).toHaveBeenCalledWith(REST);
    });

    it('should restart the idle countdown when armed again', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true });
        armIdle(session, setView);
        vi.advanceTimersByTime(ARMED_IDLE_MS - ONE_MS);
        armIdle(session, setView);
        vi.advanceTimersByTime(ARMED_IDLE_MS - ONE_MS);
        expect(session.armed).toBe(true);
    });
});

describe('lift', () => {
    it('should arm the card and mark the current press as lifted now', () => {
        const setView = vi.fn();
        const session = makeSession({ pressing: true, press: makePress() });
        lift(session, setView);
        expect(session).toMatchObject({ pressing: false, armed: true });
        expect(session.press?.liftedNow).toBe(true);
        expect(setView).toHaveBeenCalledWith({ ...REST, armed: true });
    });

    it('should still arm when the press is already gone', () => {
        const setView = vi.fn();
        const session = makeSession({ pressing: true });
        lift(session, setView);
        expect(session.armed).toBe(true);
    });

    it('should not start the idle countdown while the finger is held', () => {
        const session = makeSession({ pressing: true, press: makePress() });
        lift(session, vi.fn());
        vi.advanceTimersByTime(ARMED_IDLE_MS);
        expect(session.armed).toBe(true);
    });
});

describe('dismiss', () => {
    it('should slide the card out and call onDismiss after the slide', () => {
        const setView = vi.fn();
        const onDismiss = vi.fn();
        const session = makeSession({ armed: true });
        dismiss(session, setView, WIDTH, onDismiss);
        expect(session).toMatchObject({ closing: true, offset: WIDTH });
        expect(session.pendingDismiss).toBe(onDismiss);
        expect(setView).toHaveBeenCalledWith({
            ...REST,
            armed: true,
            closing: true,
            offset: WIDTH,
        });
        vi.advanceTimersByTime(DISMISS_SLIDE_MS - ONE_MS);
        expect(onDismiss).not.toHaveBeenCalled();
        vi.advanceTimersByTime(ONE_MS);
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(session.pendingDismiss).toBeUndefined();
    });

    it('should ignore a second dismiss while already closing', () => {
        const onDismiss = vi.fn();
        const session = makeSession({ armed: true });
        dismiss(session, vi.fn(), WIDTH, onDismiss);
        dismiss(session, vi.fn(), WIDTH, onDismiss);
        vi.advanceTimersByTime(DISMISS_SLIDE_MS);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should cancel the idle countdown so the card does not settle mid-slide', () => {
        const session = makeSession({ armed: true });
        armIdle(session, vi.fn());
        dismiss(session, vi.fn(), WIDTH, vi.fn());
        vi.advanceTimersByTime(ARMED_IDLE_MS);
        expect(session).toMatchObject({ armed: true, closing: true, offset: WIDTH });
    });

    it('should call onDismiss without waiting when reduced motion is preferred', () => {
        stubReducedMotion(true);
        const onDismiss = vi.fn();
        dismiss(makeSession({ armed: true }), vi.fn(), WIDTH, onDismiss);
        vi.advanceTimersByTime(ZERO_MS);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});

describe('releaseArmed', () => {
    it('should stay armed and start the idle countdown right after a long press', () => {
        const session = makeSession({ armed: true });
        releaseArmed(session, vi.fn(), makePress({ liftedNow: true }), vi.fn());
        expect(session.armed).toBe(true);
        vi.advanceTimersByTime(ARMED_IDLE_MS);
        expect(session.armed).toBe(false);
    });

    it('should settle back when an armed card is tapped without dragging', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true });
        releaseArmed(session, setView, makePress(), vi.fn());
        expect(session.armed).toBe(false);
        expect(setView).toHaveBeenCalledWith(REST);
    });

    it('should dismiss when dragged past the dismiss threshold', () => {
        const onDismiss = vi.fn();
        const session = makeSession({ armed: true, offset: DISMISS_OFFSET });
        releaseArmed(session, vi.fn(), makePress({ dragging: true }), onDismiss);
        expect(session).toMatchObject({ closing: true, offset: WIDTH });
        vi.advanceTimersByTime(DISMISS_SLIDE_MS);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should snap to the reveal position when dragged a little', () => {
        const setView = vi.fn();
        const session = makeSession({ armed: true, offset: REVEAL_OFFSET });
        releaseArmed(session, setView, makePress({ dragging: true }), vi.fn());
        expect(session).toMatchObject({ armed: true, revealed: true, offset: REVEAL_PX });
        expect(setView).toHaveBeenLastCalledWith({
            ...REST,
            armed: true,
            revealed: true,
            offset: REVEAL_PX,
        });
        vi.advanceTimersByTime(ARMED_IDLE_MS);
        expect(session).toMatchObject(SESSION_REST);
    });

    it('should spring back to rest when dragged less than the reveal threshold', () => {
        const onDismiss = vi.fn();
        const session = makeSession({ armed: true, offset: COLLAPSE_OFFSET });
        releaseArmed(session, vi.fn(), makePress({ dragging: true }), onDismiss);
        expect(session).toMatchObject(SESSION_REST);
        expect(onDismiss).not.toHaveBeenCalled();
    });
});

describe('takePress', () => {
    it('should ignore a different pointer and keep the press', () => {
        const press = makePress();
        const session = makeSession({ press });
        expect(takePress(session, { pointerId: OTHER_POINTER_ID })).toBeNull();
        expect(session.press).toBe(press);
    });

    it('should return null when nothing is pressed', () => {
        expect(takePress(newSession(), { pointerId: POINTER_ID })).toBeNull();
    });

    it('should hand back the press and cancel the long press before it lifts', () => {
        const press = makePress();
        const session = makeSession({ pressing: true, press });
        session.longPress = setTimeout(() => lift(session, vi.fn()), LONG_PRESS_MS);
        expect(takePress(session, { pointerId: POINTER_ID })).toBe(press);
        expect(session.press).toBeNull();
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(session.armed).toBe(false);
    });
});

describe('dropPress', () => {
    it('should cancel the long press and settle back', () => {
        const setView = vi.fn();
        const session = makeSession({ pressing: true, press: makePress() });
        session.longPress = setTimeout(() => lift(session, setView), LONG_PRESS_MS);
        dropPress(session, setView);
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(session).toMatchObject({ ...SESSION_REST, press: null });
        expect(setView).toHaveBeenCalledTimes(1);
        expect(setView).toHaveBeenCalledWith(REST);
    });

    it('should drop an armed drag back to rest', () => {
        const session = makeSession({
            armed: true,
            offset: REVEAL_OFFSET,
            press: makePress({ dragging: true }),
        });
        dropPress(session, vi.fn());
        expect(session).toMatchObject({ ...SESSION_REST, press: null });
    });
});
