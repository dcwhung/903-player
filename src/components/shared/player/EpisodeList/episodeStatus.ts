import { t } from '../../../../i18n/t';
import type { Progress } from '../../../../services/progressStore';
import { ratio } from '../../../../utils/ratio';
import { PLAYBACK_STATUS_KEY, type PlaybackState } from '../../../../utils/playbackState';
import { formatDuration, hasKnownDuration } from '../../../../utils/time';

/** upcoming：短篇劇未上架嘅一批集數（摺埋一行，P8 #6） */
export type EpisodeKind =
    'playing' | 'watched' | 'resume' | 'unwatched' | 'unavailable' | 'upcoming';

export interface EpisodeStatus {
    kind: EpisodeKind;
    /** 進度條 0–1 */
    ratio: number;
    text: string;
    /** 讀屏版（播放掣讀屏名用）：唔讀「·」（S-717）；冇就同 text 一樣 */
    spokenText?: string;
}

interface EpisodeStatusInput {
    isCurrent: boolean;
    /** 揀中集用 player 即時時間 */
    live?: { currentTime: number; duration: number };
    progress?: Progress;
    /** 揀中集嘅字眼：預設「播放中」；頁面會傳暫停（寫聽到邊，A2）/ 未開始 */
    liveState?: PlaybackState;
}

/** 揀中集（有時長）：「播放中 · 0:05 / 21:56」等；讀屏版用「，」（S-717） */
const liveStatus = (
    live: { currentTime: number; duration: number },
    liveState: PlaybackState,
): EpisodeStatus => {
    const params = {
        playing: t('common.status.playing'),
        current: formatDuration(live.currentTime),
        total: formatDuration(live.duration),
    };
    const key = PLAYBACK_STATUS_KEY[liveState];
    return {
        kind: 'playing',
        ratio: ratio(live.currentTime, live.duration),
        text: t(key, params),
        spokenText: t(key, { ...params, sep: t('common.spokenSeparator') }),
    };
};

/** 集數清單每一行嘅狀態：連線中 / 播放中 / 已收聽 / 聽到 mm:ss / 未收聽 */
export const episodeStatus = ({
    isCurrent,
    live,
    progress,
    liveState = 'playing',
}: EpisodeStatusInput): EpisodeStatus => {
    if (isCurrent && live && !hasKnownDuration(live.duration)) {
        return { kind: 'playing', ratio: 0, text: t('episodes.connecting') };
    }
    if (isCurrent && live) return liveStatus(live, liveState);
    if (progress?.watched) {
        return { kind: 'watched', ratio: 1, text: t('common.status.watched') };
    }
    if (progress && progress.position > 0) {
        const text = t('common.status.resume', { time: formatDuration(progress.position) });
        return { kind: 'resume', ratio: ratio(progress.position, progress.duration), text };
    }
    return { kind: 'unwatched', ratio: 0, text: t('common.status.unwatched') };
};

/** 試過但原站未有嘅集數：撳唔到，冇進度 */
export const unavailableStatus = (): EpisodeStatus => ({
    kind: 'unavailable',
    ratio: 0,
    text: t('episodes.unavailable'),
});
