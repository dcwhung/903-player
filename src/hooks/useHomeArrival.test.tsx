import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../dramas';
import { usePlayer } from '../player/usePlayer';
import type { Recording } from '../types/recording';
import type { Track } from '../types/track';
import { clearShowPick, markShowPicked } from './showPick';
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
) => {
    const { audio, wrapper } = createHookWrapper(recordings, prober);
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
    return { prober: () => promise, resolve };
};

describe('useHomeArrival', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => {
        vi.useRealTimers();
        clearShowPick();
    });

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

    // 用戶喺節目頁揀嘅舊集：mini player 會將佢排最前（重溫），所以照播
    it('keeps playing an older episode the user picked, which the mini player puts first as 重溫', async () => {
        markShowPicked('gongzi');
        const audio = await arrive({ target: OLD });

        await waitFor(() => expect(audio.play).toHaveBeenCalled());
        await act(async () => {});
        expect(audio.pause).not.toHaveBeenCalled();
    });

    // 節目頁自動播嘅舊集唔算重溫，mini player 唔會出，所以停（存進度）
    it('stops an older episode that the show page played by itself', async () => {
        const audio = await arrive({ target: OLD });

        await waitFor(() => expect(audio.pause).toHaveBeenCalledTimes(1));
    });

    it('stops an older episode when the user picked a different show', async () => {
        markShowPicked('badgirl');
        const audio = await arrive({ target: OLD });

        await waitFor(() => expect(audio.pause).toHaveBeenCalledTimes(1));
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

    it('keeps a picked older episode once loading finishes', async () => {
        markShowPicked('gongzi');
        const { prober, resolve } = deferred();
        const audio = await arrive({ target: OLD }, [], prober);

        await act(async () => resolve(RECORDINGS));

        expect(audio.pause).not.toHaveBeenCalled();
    });

    // 清單未載入完分唔到係咪今日：等載入完先決定
    it('waits for loading before stopping an older episode the user did not pick', async () => {
        const { prober, resolve } = deferred();
        const audio = await arrive({ target: OLD }, [], prober);
        await act(async () => {});
        expect(audio.pause).not.toHaveBeenCalled();

        await act(async () => resolve(RECORDINGS));

        expect(audio.pause).toHaveBeenCalledTimes(1);
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
});
