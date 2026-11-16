import { arcLabelOf, type SeriesEpisode } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { PLAYBACK_LINE_KEY, type PlaybackLineState } from '../../utils/playbackState';

/**
 * 短篇 chips 上面嗰行：未聽過又未載入呢套劇叫用戶揀短篇；載入咗同日子條一樣，未讀到時長講「連線中…」，
 * 否則「現正播放：短篇 · 第 N 集 集名」（暫停講「已暫停：」，載入咗未開始講「下一集：」，
 * 聽過未載入講「繼續收聽：」）
 */
export const arcPickerLabel = (
    connecting: boolean,
    current: SeriesEpisode | undefined,
    state: PlaybackLineState,
    sep: string = t('common.separator'),
): string => {
    if (state === 'unloaded') return t(PLAYBACK_LINE_KEY.unloaded);
    if (connecting) return t('episodes.connecting');
    if (!current) return '';
    const episodeNo = t('drama.episodeNo', { no: current.no });
    const episode = current.title
        ? t('drama.nowPlayingShort', { no: current.no, title: current.title, sep })
        : episodeNo;
    const label = t('drama.nowPlayingArcShort', { arc: arcLabelOf(current), episode, sep });
    return t(PLAYBACK_LINE_KEY[state], { label });
};

/** 橫版唱片下面「現正播放」：短篇加埋第幾個 / 幾多集（按排位，唔係集數），下一行集名 */
export const seriesNowPlaying = (current: SeriesEpisode, arcPosition: number, arcTotal: number) => {
    const params = { arc: arcLabelOf(current), no: arcPosition, total: arcTotal };
    return {
        label: t('drama.nowPlayingArc', params),
        // 讀屏唔讀「·」（S-723）
        spokenLabel: t('drama.nowPlayingArc', { ...params, sep: t('common.spokenSeparator') }),
        detail: current.title,
    };
};
