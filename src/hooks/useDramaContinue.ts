import type { DramaShelfItem } from '../components/DramaShelf/DramaShelf';
import { seriesEpisodesOf, type DramaConfig } from '../dramas';
import { usePlayer } from '../player/usePlayer';
import { seriesContinue } from '../selectors/arcProgress';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { getProgressMap } from '../services/progressStore';
import { isDramaEpisode } from '../types/track';
import { useRefreshedOn } from './useRefreshedOn';

type Continue = NonNullable<DramaShelfItem['resume']>;

/**
 * 主頁劇集格「繼續收聽」：按 localStorage 進度（最近聽緊嗰集，聽完就下一集）。
 * 載入緊呢套劇（mini player 已經顯示緊）、每日劇集、未聽過嘅都冇，唔使重覆
 */
export const useDramaContinue = (): ((drama: DramaConfig) => Continue | undefined) => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    return (drama) => {
        if (drama.kind !== 'series') return undefined;
        const loaded = player.recording;
        if (loaded && isDramaEpisode(loaded) && loaded.dramaId === drama.id) return undefined;
        const next = seriesContinue(seriesEpisodesOf(drama.id), progressMap);
        return next && { label: dramaEpisodeLabel(next.episode), ratio: next.ratio };
    };
};
