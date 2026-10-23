import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { t } from '../i18n/t';
import type { DailyEpisode, SeriesEpisode } from '../types/drama';
import { formatDayMonth, formatWeekday } from '../utils/date';
import { toPlayableItem, type RowContext, type RowLabels } from './episodeItems';

/** 短篇劇集一行嘅字：有集名就大字集名、細字「第 N 集」；冇集名就大字「第 N 集」 */
const seriesLabels = ({ no, title }: SeriesEpisode): RowLabels => {
    const episodeNo = t('drama.episodeNo', { no });
    return title ? { dayMonth: title, weekday: episodeNo } : { dayMonth: episodeNo, weekday: '' };
};

/** 短篇劇集清單 */
export const toSeriesItems = (episodes: readonly SeriesEpisode[], ctx: RowContext): EpisodeItem[] =>
    episodes.map((e) => toPlayableItem(e.url, seriesLabels(e), ctx));

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
