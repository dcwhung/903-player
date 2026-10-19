import { stepIndex } from '../hooks/useSwipe';
import type { SwipeDirection } from '../hooks/swipe';
import type { Recording } from '../types/recording';

/**
 * 轉集區左右掃之後要播邊集。集數係最新喺頂，所以 next（向左掃）= 下一行 = 舊一集，
 * previous（向右掃）= 上一行 = 新一集；去到盡頭或者搵唔到而家嗰集就返回 null（唔郁）
 */
export const adjacentEpisodeUrl = (
    episodesNewestFirst: readonly Pick<Recording, 'url'>[],
    currentUrl: string | undefined,
    direction: SwipeDirection,
): string | null => {
    const index = episodesNewestFirst.findIndex((r) => r.url === currentUrl);
    if (index < 0) return null;
    const next = stepIndex(index, episodesNewestFirst.length, direction);
    return next === index ? null : (episodesNewestFirst[next]?.url ?? null);
};
