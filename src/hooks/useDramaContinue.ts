import type { DramaShelfItem } from '../components/DramaShelf/DramaShelf';
import type { DramaConfig } from '../config/dramas';
import { seriesEpisodesOf } from '../data/dramaCatalog';
import { usePlayer } from '../player/usePlayer';
import { seriesContinue } from '../selectors/arcProgress';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { getProgressMap } from '../services/progressStore';
import { isDramaEpisode } from '../types/track';
import { ratio } from '../utils/ratio';
import { useRefreshedOn } from './useRefreshedOn';

type Continue = NonNullable<DramaShelfItem['resume']>;

/**
 * 主頁劇集格「繼續收聽」：載入緊呢套劇就用 player 嗰集同即時進度；
 * 否則按 localStorage 進度（最近聽緊嗰集，聽完就下一集）。每日劇集同未聽過嘅冇
 */
export const useDramaContinue = (): ((drama: DramaConfig) => Continue | undefined) => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    return (drama) => {
        if (drama.kind !== 'series') return undefined;
        const loaded = player.recording;
        if (loaded && isDramaEpisode(loaded) && loaded.dramaId === drama.id) {
            return {
                label: dramaEpisodeLabel(loaded),
                ratio: ratio(player.currentTime, player.duration),
            };
        }
        const next = seriesContinue(seriesEpisodesOf(drama.id), progressMap);
        return next && { label: dramaEpisodeLabel(next.episode), ratio: next.ratio };
    };
};
