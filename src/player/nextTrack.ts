import { seriesEpisodesOf } from '../dramas';
import { nextSeriesEpisode } from '../selectors/dramas';
import { isDramaEpisode, type Track } from '../types/track';

/**
 * 一集播完自動接住播邊集：只有短篇劇集（例如芝See菇Bi Family）會接落去；
 * 903 節目同每日劇集播完就停（同以前一樣）
 */
export const nextTrack = (track: Track): Track | undefined =>
    isDramaEpisode(track) && track.kind === 'series'
        ? nextSeriesEpisode(seriesEpisodesOf(track.dramaId), track.url)
        : undefined;
