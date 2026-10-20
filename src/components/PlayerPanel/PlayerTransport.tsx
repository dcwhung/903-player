import { usePlayer } from '../../player/usePlayer';
import { PlayerControls } from '../PlayerControls/PlayerControls';

/** 接駁共用播放器嘅控制掣（−60 / −30 / 播放暫停 / +30 / +60），節目頁同今日節目頁共用 */
export const PlayerTransport = () => {
    const player = usePlayer();
    return (
        <PlayerControls
            isPlaying={player.isPlaying}
            onToggle={() => void player.toggle()}
            onSkip={player.skip}
        />
    );
};
