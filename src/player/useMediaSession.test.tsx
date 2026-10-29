import { renderHook } from '@testing-library/react';
import { dailyEpisodesOf, seriesEpisodesOf } from '../dramas';
import type { PlayerActions, PlayerState } from './playerContext';
import { useMediaSession, type RemoteControls } from './useMediaSession';

type Handler = (details: MediaSessionActionDetails) => void;

const installMediaSession = () => {
    const handlers = new Map<string, Handler | null>();
    const session = {
        metadata: null as MediaMetadata | null,
        playbackState: 'none',
        setActionHandler: vi.fn((action: string, handler: Handler | null) => {
            handlers.set(action, handler);
        }),
    };
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
    vi.stubGlobal(
        'MediaMetadata',
        class {
            constructor(public init: MediaMetadataInit) {}
        },
    );
    return { session, handlers };
};

const state = (overrides: Partial<PlayerState> = {}): PlayerState => ({
    recording: { showId: 'gongzi', date: '2026-10-17', time: '2308', url: 'u' },
    isPlaying: true,
    isAudible: true,
    isStalled: false,
    currentTime: 0,
    duration: 100,
    watchedRevision: 0,
    ...overrides,
});

const actions = (): PlayerActions => ({
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    restart: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    stop: vi.fn(),
});

describe('useMediaSession', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        Reflect.deleteProperty(navigator, 'mediaSession');
    });

    it('publishes show name and date as metadata', () => {
        const { session } = installMediaSession();

        renderHook(() => useMediaSession(actions(), state()));

        expect((session.metadata as unknown as { init: MediaMetadataInit }).init).toMatchObject({
            title: '公子會',
            artist: '17/10（六）',
        });
        expect(session.playbackState).toBe('playing');
    });

    it('publishes drama name and episode label for a drama episode', () => {
        const { session } = installMediaSession();
        const xmas = seriesEpisodesOf('chisee').find((e) => e.title === '哥哥你洽我');
        const rerun = dailyEpisodesOf('c18').find((e) => e.date === '2025-08-11');

        const { rerender } = renderHook(({ s }) => useMediaSession(actions(), s), {
            initialProps: { s: state({ recording: xmas ?? null }) },
        });
        const init = () => (session.metadata as unknown as { init: MediaMetadataInit }).init;
        expect(init()).toMatchObject({
            title: '芝See菇Bi Family',
            artist: 'Ｘ時mas時小提議 · 第 2 集 · 哥哥你洽我',
        });

        rerender({ s: state({ recording: rerun ?? null }) });
        expect(init()).toMatchObject({ title: '18 樓 C 座', artist: '11/08（一） · 重溫' });
    });

    it('wires lock-screen buttons to player actions', () => {
        const { handlers } = installMediaSession();
        const a = actions();

        renderHook(() => useMediaSession(a, state({ isPlaying: false })));
        handlers.get('play')?.({ action: 'play' });
        handlers.get('pause')?.({ action: 'pause' });
        handlers.get('seekbackward')?.({ action: 'seekbackward' });
        handlers.get('seekforward')?.({ action: 'seekforward' });
        handlers.get('seekto')?.({ action: 'seekto', seekTime: 42 });

        expect(a.play).toHaveBeenCalledTimes(1);
        expect(a.pause).toHaveBeenCalledTimes(1);
        expect(a.toggle).not.toHaveBeenCalled();
        expect(a.skip).toHaveBeenCalledWith(-30);
        expect(a.skip).toHaveBeenCalledWith(30);
        expect(a.seek).toHaveBeenCalledWith(42);
    });

    it('binds handlers once instead of on every time update', () => {
        const { session } = installMediaSession();
        const a = actions();
        const { rerender } = renderHook(({ s }) => useMediaSession(a, s), {
            initialProps: { s: state({ currentTime: 1 }) },
        });
        const bindings = session.setActionHandler.mock.calls.length;

        rerender({ s: state({ currentTime: 2, isPlaying: false }) });

        expect(session.setActionHandler).toHaveBeenCalledTimes(bindings);
        expect(session.playbackState).toBe('paused');
    });

    it('does nothing when the browser has no Media Session API', () => {
        expect(() => renderHook(() => useMediaSession(actions(), state()))).not.toThrow();
    });
});

/** S-551：鎖屏要反映真正有冇聲，卡住時顯示 Play、進度條停低 */
describe('useMediaSession S-551 lock-screen state', () => {
    const DURATION = 798.3;
    const POSITION = 521.4;
    const SEEK_TO = 300;

    afterEach(() => {
        vi.unstubAllGlobals();
        Reflect.deleteProperty(navigator, 'mediaSession');
    });

    const withPositionState = () => {
        const installed = installMediaSession();
        const setPositionState = vi.fn();
        Object.assign(installed.session, { setPositionState });
        return { ...installed, setPositionState };
    };

    const remote = (): RemoteControls => ({ resume: vi.fn(), log: vi.fn() });

    // C-010：正常開播 / 轉集 / 自動接住播 / 短暫緩衝都維持 playing，鎖屏唔好閃 Play
    it('keeps reporting playing while a normal start or short buffer is under way', () => {
        const { session } = installMediaSession();

        renderHook(() => useMediaSession(actions(), state({ isAudible: false })));

        expect(session.playbackState).toBe('playing');
    });

    it('reports paused once the first stall deadline passes', () => {
        const { session } = installMediaSession();

        renderHook(() => useMediaSession(actions(), state({ isAudible: false, isStalled: true })));

        expect(session.playbackState).toBe('paused');
    });

    it('publishes the frozen real position while stalled', () => {
        const { setPositionState } = withPositionState();

        renderHook(() =>
            useMediaSession(
                actions(),
                state({
                    isAudible: false,
                    isStalled: true,
                    currentTime: POSITION,
                    duration: DURATION,
                }),
            ),
        );

        expect(setPositionState).toHaveBeenLastCalledWith({
            duration: DURATION,
            position: POSITION,
            playbackRate: 1,
        });
    });

    it('publishes the position again when a stall clears', () => {
        const { session, setPositionState } = withPositionState();
        const a = actions();
        const { rerender } = renderHook(({ s }) => useMediaSession(a, s), {
            initialProps: {
                s: state({
                    isAudible: false,
                    isStalled: true,
                    currentTime: POSITION,
                    duration: DURATION,
                }),
            },
        });
        setPositionState.mockClear();

        rerender({ s: state({ currentTime: POSITION + 1, duration: DURATION }) });

        expect(session.playbackState).toBe('playing');
        expect(setPositionState).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ position: POSITION + 1 }),
        );
    });

    it('does not republish the position on ordinary time updates while playing', () => {
        const { setPositionState } = withPositionState();
        const a = actions();
        const { rerender } = renderHook(({ s }) => useMediaSession(a, s), {
            initialProps: { s: state({ currentTime: POSITION, duration: DURATION }) },
        });
        setPositionState.mockClear();

        rerender({ s: state({ currentTime: POSITION + 0.25, duration: DURATION }) });

        expect(setPositionState).not.toHaveBeenCalled();
    });

    it('publishes the position after a seek, playing or paused', () => {
        const { setPositionState } = withPositionState();
        const a = actions();
        const { rerender } = renderHook(({ s }) => useMediaSession(a, s), {
            initialProps: { s: state({ currentTime: POSITION, duration: DURATION }) },
        });

        rerender({ s: state({ currentTime: SEEK_TO, duration: DURATION }) });
        expect(setPositionState).toHaveBeenLastCalledWith(
            expect.objectContaining({ position: SEEK_TO }),
        );

        rerender({
            s: state({
                isPlaying: false,
                isAudible: false,
                currentTime: SEEK_TO,
                duration: DURATION,
            }),
        });
        rerender({
            s: state({
                isPlaying: false,
                isAudible: false,
                currentTime: POSITION,
                duration: DURATION,
            }),
        });
        expect(setPositionState).toHaveBeenLastCalledWith(
            expect.objectContaining({ position: POSITION }),
        );
    });

    it('skips position state while the duration is unknown or endless', () => {
        const { setPositionState } = withPositionState();
        const a = actions();
        const { rerender } = renderHook(({ s }) => useMediaSession(a, s), {
            initialProps: { s: state({ duration: 0 }) },
        });

        rerender({ s: state({ duration: Number.NaN, isAudible: false }) });
        rerender({ s: state({ duration: Number.POSITIVE_INFINITY }) });

        expect(setPositionState).not.toHaveBeenCalled();
    });

    it('keeps the published position within the duration', () => {
        const { setPositionState } = withPositionState();

        renderHook(() =>
            useMediaSession(actions(), state({ currentTime: DURATION + 1, duration: DURATION })),
        );

        expect(setPositionState).toHaveBeenLastCalledWith(
            expect.objectContaining({ position: DURATION }),
        );
    });

    it('works without setPositionState (older Safari)', () => {
        installMediaSession();

        expect(() =>
            renderHook(() => useMediaSession(actions(), state({ isAudible: false }))),
        ).not.toThrow();
    });

    it('sends lock-screen play to resume, which retries a stall', () => {
        const { handlers } = installMediaSession();
        const a = actions();
        const r = remote();

        renderHook(() => useMediaSession(a, state({ isAudible: false }), r));
        handlers.get('play')?.({ action: 'play' });

        expect(r.resume).toHaveBeenCalledTimes(1);
        expect(a.play).not.toHaveBeenCalled();
    });

    it('logs every lock-screen action', () => {
        const { handlers } = installMediaSession();
        const r = remote();

        renderHook(() => useMediaSession(actions(), state(), r));
        handlers.get('play')?.({ action: 'play' });
        handlers.get('pause')?.({ action: 'pause' });
        handlers.get('seekbackward')?.({ action: 'seekbackward' });
        handlers.get('seekforward')?.({ action: 'seekforward' });
        handlers.get('seekto')?.({ action: 'seekto', seekTime: 42 });

        expect(vi.mocked(r.log).mock.calls).toEqual([
            ['ms:play', undefined],
            ['ms:pause', undefined],
            ['ms:seekbackward', undefined],
            ['ms:seekforward', undefined],
            ['ms:seekto', 'to=42.0'],
        ]);
    });

    // S-578：同其他 log 欄位一樣 1 位小數
    it('logs the lock-screen seek target with one decimal', () => {
        const { handlers } = installMediaSession();
        const r = remote();

        renderHook(() => useMediaSession(actions(), state(), r));
        handlers.get('seekto')?.({ action: 'seekto', seekTime: 123.45678901 });

        expect(r.log).toHaveBeenCalledWith('ms:seekto', 'to=123.5');
    });
});
