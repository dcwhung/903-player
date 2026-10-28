import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState, type ReactNode } from 'react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../dramas';
import { PlayerContext, type PlayerContextValue } from '../player/playerContext';
import { usePlayer } from '../player/usePlayer';
import type { Recording } from '../types/recording';
import type { Track } from '../types/track';
import { useHomeArrival } from './useHomeArrival';

const TODAY = recording('badgirl', '2026-10-19', '1000');
const OLD = recording('gongzi', '2026-10-10');
const RECORDINGS = [OLD, recording('gongzi', '2026-10-17'), TODAY];

const Home = () => {
    useHomeArrival();
    return <p>home</p>;
};

/** 先喺「其他頁」播 target（可以冇），再轉去主頁 */
const Harness = ({ target, later }: { target?: Track; later?: Recording }) => {
    const { load } = usePlayer();
    const [isHome, setIsHome] = useState(false);
    if (isHome) {
        return (
            <>
                <Home />
                {later && (
                    <button type="button" onClick={() => void load(later, { autoplay: true })}>
                        play later
                    </button>
                )}
            </>
        );
    }
    const arrive = async () => {
        if (target) await load(target, { autoplay: true });
        setIsHome(true);
    };
    return (
        <button type="button" onClick={() => void arrive()}>
            arrive
        </button>
    );
};

const arrive = async (
    props: { target?: Track; later?: Recording },
    recordings: Recording[] = RECORDINGS,
    prober?: () => Promise<Recording[]>,
    strict = false,
) => {
    const { audio, wrapper: Providers } = createHookWrapper(recordings, prober);
    const wrapper = ({ children }: { children: ReactNode }) =>
        strict ? (
            <StrictMode>
                <Providers>{children}</Providers>
            </StrictMode>
        ) : (
            <Providers>{children}</Providers>
        );
    render(<Harness {...props} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'arrive' }));
    await screen.findByText('home');
    return audio;
};

/** 直接畀 context：可以換 stop（identity 變）睇 effect 再行會唔會再停 */
const playerValue = (stop: () => void): PlayerContextValue => ({
    recording: null,
    isPlaying: false,
    isAudible: false,
    currentTime: 0,
    duration: 0,
    watchedRevision: 0,
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    restart: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    stop,
});

const ArrivalWith = ({ stop }: { stop: () => void }) => (
    <PlayerContext.Provider value={playerValue(stop)}>
        <Home />
    </PlayerContext.Provider>
);

const deferred = () => {
    let resolve: (value: Recording[]) => void = () => {};
    const promise = new Promise<Recording[]>((r) => {
        resolve = r;
    });
    return { prober: () => promise, resolve };
};

describe('useHomeArrival', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('keeps playing a recording that the mini player lists', async () => {
        const audio = await arrive({ target: TODAY });

        await waitFor(() => expect(audio.play).toHaveBeenCalled());
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('keeps playing a drama episode, which the mini player shows instead of today', async () => {
        const drama = seriesEpisodesOf('chisee')[0];
        const audio = await arrive({ target: drama });

        await waitFor(() => expect(audio.play).toHaveBeenCalled());
        expect(audio.pause).not.toHaveBeenCalled();
    });

    // 以前舊集唔喺 mini player 清單就停；而家 mini player 會將佢排最前（重溫），所以照播
    it('keeps playing an older episode, which the mini player puts first as 重溫', async () => {
        const audio = await arrive({ target: OLD });

        await waitFor(() => expect(audio.play).toHaveBeenCalled());
        await act(async () => {});
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('stops when nothing was playing', async () => {
        const audio = await arrive({});

        await waitFor(() => expect(audio.pause).toHaveBeenCalledTimes(1));
    });

    it('keeps playing the latest day when no show airs today', async () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z')); // 香港 18/10（日）
        const latest = recording('gongzi', '2026-10-17');
        const audio = await arrive({ target: latest }, [OLD, latest]);

        await act(async () => {});
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('keeps an older episode once loading finishes', async () => {
        const { prober, resolve } = deferred();
        const audio = await arrive({ target: OLD }, [], prober);

        await act(async () => resolve(RECORDINGS));

        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('keeps a today recording once loading finishes', async () => {
        const { prober, resolve } = deferred();
        const audio = await arrive({ target: TODAY }, [], prober);

        await act(async () => resolve(RECORDINGS));

        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('decides only once per arrival', async () => {
        const audio = await arrive({ target: TODAY, later: OLD });
        await act(async () => {});

        await userEvent.click(screen.getByRole('button', { name: 'play later' }));

        expect(audio.src).toBe(OLD.url);
        expect(audio.pause).not.toHaveBeenCalled();
    });

    // StrictMode 會 mount → cleanup → mount 多行一次 effect：decided ref 要擋住第二次 stop
    it('stops only once under StrictMode double effects', async () => {
        const audio = await arrive({}, RECORDINGS, undefined, true);

        await waitFor(() => expect(audio.pause).toHaveBeenCalled());
        await act(async () => {});
        expect(audio.pause).toHaveBeenCalledTimes(1);
    });

    it('does not stop again when stop changes identity and the effect re-runs', () => {
        const firstStop = vi.fn();
        const nextStop = vi.fn();
        const { rerender } = render(<ArrivalWith stop={firstStop} />);

        rerender(<ArrivalWith stop={nextStop} />);

        expect(firstStop).toHaveBeenCalledTimes(1);
        expect(nextStop).not.toHaveBeenCalled();
    });
});
