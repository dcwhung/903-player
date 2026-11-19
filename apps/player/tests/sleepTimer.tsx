import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FakeAudio } from './fakeAudio';
import { PlayerProvider } from '../src/player/PlayerProvider';
import { usePlayer } from '../src/player/usePlayer';
import type { Recording } from '../src/types/recording';

/** 裝置本地時間（月亮掣跟本地 21:00–05:00，唔可以用 +08:00 寫死：CI 係 UTC） */
export const NIGHT = new Date(2026, 10, 30, 22, 30).getTime();
export const DAY = new Date(2026, 10, 30, 14, 0).getTime();
export const MINUTE_MS = 60_000;

export const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: 'id:https://audio.hkfm903.live/gongzi/20261017.aac',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};

type Player = ReturnType<typeof usePlayer>;

/** 攞 player（載錄音）用：render 喺 provider 入面 */
const PlayerProbe = ({ onPlayer }: { onPlayer: (player: Player) => void }) => {
    onPlayer(usePlayer());
    return null;
};

/** 真 PlayerProvider（入面有 SleepTimerController）+ 假 audio */
export const renderWithSleepTimer = (ui: ReactNode) => {
    const audio = new FakeAudio();
    let player: Player | undefined;
    const utils = render(
        <PlayerProvider audio={audio.asAudio()}>
            <PlayerProbe
                onPlayer={(value) => {
                    player = value;
                }}
            />
            {ui}
        </PlayerProvider>,
    );
    /** 載入一集 10 分鐘嘅錄音（「播完呢集」先揀得） */
    const loadEpisode = async (durationSeconds = 600, currentSeconds = 1) => {
        await act(async () => {
            await player?.load(RECORDING, { autoplay: true });
        });
        act(() => {
            audio.emitMetadata(durationSeconds);
            audio.emitTime(currentSeconds);
        });
    };
    return { ...utils, audio, loadEpisode };
};
