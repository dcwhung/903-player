import type { DramaShelfItem } from '../components/pages/home/DramaShelf/DramaShelf';
import type { DramaConfig } from '../catalog/dramas';
import { usePlayer } from '../player/usePlayer';
import { isLeavingSoon } from '../selectors/availability';
import { dayWhen, spokenRemoval, removalWhen } from '../selectors/availabilityLabels';
import { liveSeriesContinue } from '../selectors/continueListening';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { getProgressMap } from '../services/progressStore';
import { isDramaEpisode } from '../types/track';
import { hkToday } from '../utils/date';
import { useRefreshedOn } from './useRefreshedOn';
import { catalogSeriesOf } from './useStartDrama';

type Continue = NonNullable<DramaShelfItem['resume']>;

/** 嗰集快將下架：「05/12 下架」（讀屏長版）；唔係就冇 */
const leavingOf = (removedAt: string | undefined, today: string) =>
    removedAt && isLeavingSoon(removedAt, today)
        ? {
              text: removalWhen(removedAt, today, 'short'),
              tag: dayWhen(removedAt, today),
              date: removedAt,
              label: spokenRemoval(removedAt),
          }
        : undefined;

/**
 * 主頁劇集格「繼續收聽」：按 localStorage 進度（最近聽緊嗰集，聽完就下一集）。
 * 嗰集下架咗就跳去下一集未下架嘅，冇就收埋條；快將下架就集名後面加琥珀字（LC2）。
 * 載入緊呢套劇（mini player 已經顯示緊）、每日劇集、未聽過嘅都冇，唔使重覆
 */
export const useDramaContinue = (): ((drama: DramaConfig) => Continue | undefined) => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    return (drama) => {
        if (drama.kind !== 'series') return undefined;
        const loaded = player.recording;
        if (loaded && isDramaEpisode(loaded) && loaded.dramaId === drama.id) return undefined;
        const today = hkToday();
        const next = liveSeriesContinue(catalogSeriesOf(drama.id), progressMap, today);
        if (!next) return undefined;
        const leaving = leavingOf(next.episode.removedAt, today);
        return { label: dramaEpisodeLabel(next.episode), ratio: next.ratio, leaving };
    };
};
