import { usePlayer } from '../player/usePlayer';
import type { Track } from '../types/track';
import { useMiniPlayerDismissed } from './miniPlayerDismissed';

/**
 * player 係咪俾其他 audio 佔住：載入咗嘢（播緊或者暫停緊，mini player 顯示緊）就算；
 * 用戶左滑關咗 mini player（停咗、收埋）就唔算。
 * 主頁撳格 / 入節目、今日節目、每日劇集頁只喺唔佔住先自動播，唔好蓋過用戶播緊（或者暫停緊）嘅嘢
 */
export const isAudioBusy = (recording: Track | null, miniPlayerDismissed: boolean): boolean =>
    recording !== null && !miniPlayerDismissed;

export const useAudioBusy = (): boolean => {
    const { recording } = usePlayer();
    return isAudioBusy(recording, useMiniPlayerDismissed());
};
