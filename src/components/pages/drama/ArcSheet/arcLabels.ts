import { t } from '../../../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../../../selectors/arcProgress';
import type { SeriesEpisode } from '../../../../types/drama';
import { formatDuration } from '../../../../utils/time';
import type { ArcRowNotes } from './arcSheetTypes';

export const GROUP_TITLES = {
    playing: 'common.status.playing',
    new: 'drama.groupNew',
    unfinished: 'drama.groupUnfinished',
    done: 'common.status.watched',
} as const satisfies Record<ArcGroup, string>;

/** 「即將上架」組（S1，排最底）嘅標題 */
export const UPCOMING_GROUP_TITLE = 'availability.groupUpcoming' as const;

/** 行入面細字：播緊 / 聽到邊 / 下一集 / 未聽 / 聽完；sep：讀屏句傳「，」（S-717） */
const arcStatus = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    sep: string = t('common.separator'),
): string => {
    if (current?.arc === s.arc) return t('drama.arcPlayingEpisode', { no: current.no });
    if (s.state === 'new') return t('drama.arcNew', { count: s.total, sep });
    if (s.state === 'done') return t('drama.arcDone', { count: s.total, sep });
    return s.resumeAt > 0
        ? t('drama.arcResumeAt', { no: s.resume.no, time: formatDuration(s.resumeAt) })
        : t('drama.arcNext', { no: s.resume.no });
};

const joinStatus = (parts: readonly (string | false)[]): string => parts.filter(Boolean).join('，');

/** 上架 / 下架補充（A2 / LS2）：狀態字可以被取代，後面用分隔符（common.separator）接埋批次 / 下架日 */
const statusWithNotes = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    notes: ArcRowNotes | undefined,
): string => {
    const main =
        current?.arc === s.arc ? arcStatus(s, current) : (notes?.status ?? arcStatus(s, current));
    return [main, ...(notes?.suffixes ?? [])].join(t('common.separator'));
};

/** 讀屏嘅狀態字（F2）：唔帶集數（集數另外一段講） */
const spokenStatus = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    notes: ArcRowNotes,
): string => {
    if (current?.arc === s.arc) return arcStatus(s, current);
    if (notes.status) return notes.status;
    if (s.state === 'new') return t('common.status.unwatched');
    if (s.state === 'done') return t('common.status.watched');
    return arcStatus(s, current);
};

/**
 * 有上架 / 下架補充嘅行，讀屏名逐段砌（F2）：「{狀態}，{N} 集，{讀屏日子} 下架」，
 * 唔讀分隔符、唔重覆「快將下架」
 */
const spokenRowLabel = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    notes: ArcRowNotes,
): string =>
    joinStatus([
        spokenStatus(s, current, notes),
        t('availability.arcEpisodeCount', { count: notes.total ?? s.total }),
        ...notes.spokenSuffixes,
        s.isNew && t('drama.arcNewLabel'),
    ]);

/** 行入面細字：狀態（+ 上架 / 下架補充）+ 新上架 */
export const visibleStatus = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    notes?: ArcRowNotes,
): string => joinStatus([statusWithNotes(s, current, notes), s.isNew && t('drama.arcNewLabel')]);

/**
 * 行嘅讀屏名：狀態 +（聽咗一半先講）聽完幾多集 + 新上架。畫面上集數喺碟面 pill（aria-hidden），
 * 所以要喺度講；未聽 / 聽完嘅狀態本身已經講咗集數
 */
export const rowLabel = (
    s: ArcSummary,
    current: SeriesEpisode | undefined,
    notes?: ArcRowNotes,
): string =>
    notes
        ? spokenRowLabel(s, current, notes)
        : joinStatus([
              arcStatus(s, current, t('common.spokenSeparator')),
              s.state === 'started' &&
                  t('drama.arcWatchedCount', { watched: s.watched, total: s.total }),
              s.isNew && t('drama.arcNewLabel'),
          ]);

/** 右邊播放掣嘅讀屏名 */
export const playLabel = (s: ArcSummary, isCurrent: boolean, isPlaying: boolean): string => {
    if (isCurrent) return t(isPlaying ? 'drama.arcPause' : 'drama.arcPlay', { arc: s.arc });
    if (s.state === 'new') return t('drama.arcPlayNew', { arc: s.arc });
    if (s.state === 'done') return t('drama.arcPlayAgain', { arc: s.arc });
    return t('drama.arcPlayResume', { arc: s.arc, no: s.resume.no });
};
