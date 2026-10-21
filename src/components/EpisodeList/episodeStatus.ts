import { t } from '../../i18n/t';
import type { Progress } from '../../services/progressStore';
import { ratio } from '../../utils/ratio';
import { formatDuration, hasKnownDuration } from '../../utils/time';

export type EpisodeKind = 'playing' | 'watched' | 'resume' | 'unwatched' | 'unavailable';

export interface EpisodeStatus {
    kind: EpisodeKind;
    /** 進度條 0–1 */
    ratio: number;
    text: string;
}

interface EpisodeStatusInput {
    isCurrent: boolean;
    /** 揀中集用 player 即時時間 */
    live?: { currentTime: number; duration: number };
    progress?: Progress;
}

/** 集數清單每一行嘅狀態：連線中 / 播放中 / 已收聽 / 聽到 mm:ss / 未收聽 */
export const episodeStatus = ({ isCurrent, live, progress }: EpisodeStatusInput): EpisodeStatus => {
    if (isCurrent && live && !hasKnownDuration(live.duration)) {
        return { kind: 'playing', ratio: 0, text: t('episodes.connecting') };
    }
    if (isCurrent && live) {
        const text = t('episodes.playing', {
            current: formatDuration(live.currentTime),
            total: formatDuration(live.duration),
        });
        return { kind: 'playing', ratio: ratio(live.currentTime, live.duration), text };
    }
    if (progress?.watched) {
        return { kind: 'watched', ratio: 1, text: t('episodes.watched') };
    }
    if (progress && progress.position > 0) {
        const text = t('episodes.resume', { time: formatDuration(progress.position) });
        return { kind: 'resume', ratio: ratio(progress.position, progress.duration), text };
    }
    return { kind: 'unwatched', ratio: 0, text: t('episodes.unwatched') };
};

/** 試過但原站未有嘅集數：撳唔到，冇進度 */
export const unavailableStatus = (): EpisodeStatus => ({
    kind: 'unavailable',
    ratio: 0,
    text: t('episodes.unavailable'),
});
