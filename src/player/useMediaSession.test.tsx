import { renderHook } from '@testing-library/react';
import type { PlayerContextValue } from './playerContext';
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

const player = (overrides: Partial<PlayerContextValue> = {}): PlayerContextValue => ({
    recording: { showId: 'gongzi', date: '2026-10-17', time: '2308', url: 'u' },
    isPlaying: true,
    currentTime: 0,
    duration: 100,
    watchedRevision: 0,
    load: vi.fn(),
    toggle: vi.fn(),
    restart: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    stop: vi.fn(),
    ...overrides,
});

describe('useMediaSession', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        Reflect.deleteProperty(navigator, 'mediaSession');
    });

    it('publishes show name and date as metadata', () => {
        const { session } = installMediaSession();

        renderHook(() => useMediaSession(player()));

        expect((session.metadata as unknown as { init: MediaMetadataInit }).init).toMatchObject({
            title: '公子會',
            artist: '17/10（六）',
        });
        expect(session.playbackState).toBe('playing');
    });

    it('wires lock-screen buttons to player actions', () => {
        const { handlers } = installMediaSession();
        const p = player({ isPlaying: false });

        renderHook(() => useMediaSession(p));
        handlers.get('play')?.({ action: 'play' });
        handlers.get('seekbackward')?.({ action: 'seekbackward' });
        handlers.get('seekforward')?.({ action: 'seekforward' });
        handlers.get('seekto')?.({ action: 'seekto', seekTime: 42 });

        expect(p.toggle).toHaveBeenCalledTimes(1);
        expect(p.skip).toHaveBeenCalledWith(-30);
        expect(p.skip).toHaveBeenCalledWith(30);
        expect(p.seek).toHaveBeenCalledWith(42);
    });

    it('does nothing when the browser has no Media Session API', () => {
        expect(() => renderHook(() => useMediaSession(player()))).not.toThrow();
    });
});
