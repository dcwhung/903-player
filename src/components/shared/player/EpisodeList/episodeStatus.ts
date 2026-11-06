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
    /**
     * 播緊（有時長）：行出「播放中」紅 pill（OnAirBadge）+ 左邊紅條，text 淨係時間「0:05 / 21:56」；
     * spokenText 照講「播放中，0:05 / 21:56」
     */
    onAir?: true;
}

interface EpisodeStatusInput {
    isCurrent: boolean;
    /** 揀中集用 player 即時時間 */
    live?: { currentTime: number; duration: number };
    progress?: Progress;
    /** 揀中集嘅字眼：預設「播放中」；頁面會傳暫停（寫聽到邊，A2）/ 未開始 */
    liveState?: PlaybackState;
}

/**
 * 揀中集（有時長）：播緊 = pill +「0:05 / 21:56」；暫停「聽到 0:05 / 21:56」；未開始「未開始 · 0:00 / 11:17」。
 * 讀屏版用「，」（S-717），播緊照讀「播放中，0:05 / 21:56」
 */
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
    const spokenText = t(key, { ...params, sep: t('common.spokenSeparator') });
    const shown = ratio(live.currentTime, live.duration);
    if (liveState === 'playing') {
        // 「播放中」由 pill 出，字唔再重複
        const text = t('player.progressText', params);
        return { kind: 'playing', ratio: shown, text, spokenText, onAir: true };
    }
    return { kind: 'playing', ratio: shown, text: t(key, params), spokenText };
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
