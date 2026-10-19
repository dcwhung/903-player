import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { usePlayer } from '../player/usePlayer';
import type { Recording } from '../types/recording';
import { useHomeArrival } from './useHomeArrival';

const TODAY = recording('badgirl', '2026-10-19', '1000');
const OLD = recording('gongzi', '2026-10-10');
const RECORDINGS = [OLD, recording('gongzi', '2026-10-17'), TODAY];

const Home = () => {
    useHomeArrival();
    return <p>home</p>;
};

/** 先喺「其他頁」播 target（可以冇），再轉去主頁 */
const Harness = ({ target, later }: { target?: Recording; later?: Recording }) => {
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
    props: { target?: Recording; later?: Recording },
    recordings: Recording[] = RECORDINGS,
    loader?: () => Promise<Recording[]>,
) => {
    const { audio, wrapper } = createHookWrapper(recordings, loader);
    render(<Harness {...props} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'arrive' }));
    await screen.findByText('home');
    return audio;
};

const deferred = () => {
    let resolve: (value: Recording[]) => void = () => {};
    const promise = new Promise<Recording[]>((r) => {
        resolve = r;
    });
    return { loader: () => promise, resolve };
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

    it('stops an older episode', async () => {
        const audio = await arrive({ target: OLD });

        await waitFor(() => expect(audio.pause).toHaveBeenCalledTimes(1));
    });

    it('stops when nothing was playing', async () => {
        const audio = await arrive({});

        await waitFor(() => expect(audio.pause).toHaveBeenCalledTimes(1));
    });

    it('keeps playing the latest day when nothing was recorded today', async () => {
        const latest = recording('gongzi', '2026-10-17');
        const audio = await arrive({ target: latest }, [OLD, latest]);

        await act(async () => {});
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('waits for the recordings before deciding', async () => {
        const { loader, resolve } = deferred();
        const audio = await arrive({ target: OLD }, [], loader);
        expect(audio.pause).not.toHaveBeenCalled();

        await act(async () => resolve(RECORDINGS));

        expect(audio.pause).toHaveBeenCalledTimes(1);
    });

    it('keeps a today recording once loading finishes', async () => {
        const { loader, resolve } = deferred();
        const audio = await arrive({ target: TODAY }, [], loader);

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
});
