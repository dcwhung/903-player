import { usePlayer } from '../player/usePlayer';
import type { Track } from '../types/track';

/**
 * 集數清單 / 日子條嘅動作（節目頁、劇集頁共用）：揀集就由嗰集開始播；
 * 撳播緊嗰集就暫停（掣係暫停樣），其他集就播嗰集。
 * isPlayingCurrent 由 caller 決定（每頁「當播緊」嘅條件唔同）
 */
export const useEpisodePress = (
    episodes: readonly Track[],
    currentUrl: string | undefined,
    isPlayingCurrent: boolean,
) => {
    const player = usePlayer();
    const selectEpisode = (url: string) => {
        const episode = episodes.find((e) => e.url === url);
        if (episode) void player.load(episode, { autoplay: true });
    };
    const pressEpisode = (url: string) =>
        isPlayingCurrent && url === currentUrl ? void player.toggle() : selectEpisode(url);
    return { selectEpisode, pressEpisode };
};
