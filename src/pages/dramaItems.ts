import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { t } from '../i18n/t';
import type { DailyEpisode, SeriesEpisode } from '../types/drama';
import { formatDayMonth, formatWeekday } from '../utils/date';
import { toPlayableItem, type RowContext } from './episodeItems';

/** 主題劇集清單：大字集名、細字「第 N 集」 */
export const toSeriesItems = (episodes: readonly SeriesEpisode[], ctx: RowContext): EpisodeItem[] =>
    episodes.map((e) =>
        toPlayableItem(
            e.url,
            { dayMonth: e.title, weekday: t('drama.episodeNo', { no: e.no }) },
            ctx,
        ),
    );

/** 每日劇集清單：同節目一樣用日子；重播舊集加「重溫」 */
export const toDailyItems = (episodes: readonly DailyEpisode[], ctx: RowContext): EpisodeItem[] =>
    episodes.map((e) =>
        toPlayableItem(
            e.url,
            {
                dayMonth: formatDayMonth(e.date),
                weekday: formatWeekday(e.date),
                tag: e.rerun ? t('drama.rerun') : undefined,
            },
            ctx,
        ),
    );
