import { t } from '../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { formatDuration } from '../../utils/time';

export const GROUP_TITLES = {
    playing: 'drama.groupPlaying',
    new: 'drama.groupNew',
    unfinished: 'drama.groupUnfinished',
    done: 'drama.groupDone',
} as const satisfies Record<ArcGroup, string>;

/** 行入面細字：播緊 / 聽到邊 / 下一集 / 未聽 / 聽完 */
const arcStatus = (s: ArcSummary, current: SeriesEpisode | undefined): string => {
    if (current?.arc === s.arc) return t('drama.arcPlayingEpisode', { no: current.no });
    if (s.state === 'new') return t('drama.arcNew', { count: s.total });
    if (s.state === 'done') return t('drama.arcDone', { count: s.total });
    return s.resumeAt > 0
        ? t('drama.arcResumeAt', { no: s.resume.no, time: formatDuration(s.resumeAt) })
        : t('drama.arcNext', { no: s.resume.no });
};

const joinStatus = (parts: readonly (string | false)[]): string => parts.filter(Boolean).join('，');

/** 行入面細字：狀態 + 新上架（同以前一樣） */
export const visibleStatus = (s: ArcSummary, current: SeriesEpisode | undefined): string =>
    joinStatus([arcStatus(s, current), s.isNew && t('drama.arcNewLabel')]);

/**
 * 行嘅讀屏名：狀態 +（聽咗一半先講）聽完幾多集 + 新上架。畫面上集數喺碟面 pill（aria-hidden），
 * 所以要喺度講；未聽 / 聽完嘅狀態本身已經講咗集數
 */
export const rowLabel = (s: ArcSummary, current: SeriesEpisode | undefined): string =>
    joinStatus([
        arcStatus(s, current),
        s.state === 'started' && t('drama.arcWatchedCount', { watched: s.watched, total: s.total }),
        s.isNew && t('drama.arcNewLabel'),
    ]);

/** 右邊播放掣嘅讀屏名 */
export const playLabel = (s: ArcSummary, isCurrent: boolean, isPlaying: boolean): string => {
    if (isCurrent) return t(isPlaying ? 'drama.arcPause' : 'drama.arcPlay', { arc: s.arc });
    if (s.state === 'new') return t('drama.arcPlayNew', { arc: s.arc });
    if (s.state === 'done') return t('drama.arcPlayAgain', { arc: s.arc });
    return t('drama.arcPlayResume', { arc: s.arc, no: s.resume.no });
};
