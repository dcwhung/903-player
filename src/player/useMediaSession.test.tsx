import { renderHook } from '@testing-library/react';
import { dailyEpisodesOf, seriesEpisodesOf } from '../dramas';
import type { PlayerActions, PlayerState } from './playerContext';
import { useMediaSession } from './useMediaSession';

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
            artist: 'Ｘ時mas時小提議 · 第 2 集 哥哥你洽我',
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
