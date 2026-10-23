import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { t } from '../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { ratio, toPercent } from '../../utils/ratio';
import { formatDuration } from '../../utils/time';
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, RestartIcon } from '../icons/icons';
import { NewBadge } from '../NewBadge/NewBadge';
import styles from './ArcSheet.module.css';

interface ArcSheetProps {
    open: boolean;
    /** 分好組嘅短篇（播放中 → 新上架 → 未聽完 → 已聽完，見 arcGroups） */
    groups: readonly { group: ArcGroup; items: readonly ArcSummary[] }[];
    /** 載入緊嘅一集（屬於邊個短篇就框住嗰行） */
    current: SeriesEpisode | undefined;
    isPlaying: boolean;
    /** 撳一行：轉去睇嗰個短篇嘅集數 */
    onPick: (arc: string) => void;
    /** 撳右邊掣：播嗰個短篇（續聽 / 未收聽 / 重聽；播緊嗰個就暫停 / 繼續） */
    onPlay: (summary: ArcSummary) => void;
    onClose: () => void;
}

const CLOSE_ICON_SIZE = 20;
const PLAY_ICON_SIZE = 18;
const CHECK_ICON_SIZE = 14;

const GROUP_TITLES = {
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

/** 右邊播放掣嘅讀屏名 */
const playLabel = (s: ArcSummary, isCurrent: boolean, isPlaying: boolean): string => {
    if (isCurrent) return t(isPlaying ? 'drama.arcPause' : 'drama.arcPlay', { arc: s.arc });
    if (s.state === 'new') return t('drama.arcPlayNew', { arc: s.arc });
    if (s.state === 'done') return t('drama.arcPlayAgain', { arc: s.arc });
    return t('drama.arcPlayResume', { arc: s.arc, no: s.resume.no });
};

/** 右邊掣個 icon：播緊 ❚❚；聽完 ↺ 重聽；其他 ▶ */
const PlayButtonIcon = ({
    summary,
    isCurrent,
    isPlaying,
}: {
    summary: ArcSummary;
    isCurrent: boolean;
    isPlaying: boolean;
}) => {
    if (isCurrent && isPlaying) return <PauseIcon size={PLAY_ICON_SIZE} />;
    if (!isCurrent && summary.state === 'done') return <RestartIcon size={PLAY_ICON_SIZE} />;
    return <PlayIcon size={PLAY_ICON_SIZE} />;
};

type RowProps = Pick<ArcSheetProps, 'current' | 'isPlaying' | 'onPick' | 'onPlay'> & {
    summary: ArcSummary;
};

/** 一行：左邊撳轉短篇（圓環 + 名 + 進度），右邊播放掣 */
const ArcRow = ({ summary: s, current, isPlaying, onPick, onPlay }: RowProps) => {
    const isCurrent = current?.arc === s.arc;
    const status = [arcStatus(s, current), s.isNew && t('drama.arcNewLabel')]
        .filter(Boolean)
        .join('，');
    return (
        <li className={`${styles.row} ${isCurrent ? styles.current : ''}`}>
            <button
                type="button"
                className={styles.pick}
                data-role="pick"
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={t('drama.arcRow', { arc: s.arc, status })}
                onClick={() => onPick(s.arc)}
            >
                <span
                    className={`${styles.ring} ${s.state === 'done' ? styles.done : ''}`}
                    style={
                        {
                            '--arc-ring-fill': `${toPercent(ratio(s.watched, s.total))}%`,
                        } as CSSProperties
                    }
                    aria-hidden="true"
                >
                    {s.state === 'done' ? (
                        <CheckIcon size={CHECK_ICON_SIZE} />
                    ) : (
                        `${s.watched}/${s.total}`
                    )}
                </span>
                <span className={styles.text} aria-hidden="true">
                    <span className={styles.name}>
                        {s.arc}
                        {s.isNew && <NewBadge size="sm" className={styles.fresh} />}
                    </span>
                    <span className={styles.status}>{status}</span>
                </span>
            </button>
            <button
                type="button"
                className={styles.play}
                aria-label={playLabel(s, isCurrent, isPlaying)}
                onClick={() => onPlay(s)}
            >
                <PlayButtonIcon summary={s} isCurrent={isCurrent} isPlaying={isPlaying} />
            </button>
        </li>
    );
};

/** 打開時焦點入表；Escape 收埋；收埋之後焦點返去打開前嗰粒掣 */
const useSheetFocus = (open: boolean, onClose: () => void) => {
    const sheetRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement as HTMLElement | null;
        sheetRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [open, onClose]);
    return sheetRef;
};

/** 一組：細標題（播放中 / 新上架 / 未聽完 / 已聽完）+ 嗰組嘅短篇 */
const ArcGroupBlock = ({
    group,
    items,
    ...rowProps
}: ArcSheetProps['groups'][number] & Omit<RowProps, 'summary'>) => {
    const headingId = useId();
    return (
        <section aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.groupTitle}>
                {t(GROUP_TITLES[group])}
            </h3>
            <ul className={styles.groupList}>
                {items.map((s) => (
                    <ArcRow key={s.arc} summary={s} {...rowProps} />
                ))}
            </ul>
        </section>
    );
};

/**
 * 全集一覽表（底部彈出）：分組 播放中 → 新上架 → 未聽完 → 已聽完，圓環 = 聽完幾多集；
 * 撳行轉去嗰個短篇，撳右邊掣直接播（續聽 / 未收聽 / ↺ 重聽）。
 * 見 design/previews/drama-flow-preview.html
 */
export const ArcSheet = ({ open, groups, onClose, ...rowProps }: ArcSheetProps) => {
    const titleId = useId();
    const sheetRef = useSheetFocus(open, onClose);
    if (!open) return null;
    const all = groups.flatMap((g) => g.items);
    const done = all.filter((s) => s.state === 'done').length;
    return (
        <div className={styles.overlay}>
            <div className={styles.backdrop} data-testid="arc-sheet-backdrop" onClick={onClose} />
            <section
                ref={sheetRef}
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <span className={styles.grab} aria-hidden="true" />
                <header className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {t('drama.sheetTitle')}
                    </h2>
                    <span className={styles.summary}>
                        {t('drama.sheetDone', { done, total: all.length })}
                    </span>
                    <button
                        type="button"
                        className={styles.close}
                        aria-label={t('drama.sheetClose')}
                        onClick={onClose}
                    >
                        <CloseIcon size={CLOSE_ICON_SIZE} />
                    </button>
                </header>
                <div className={styles.list}>
                    {groups.map((g) => (
                        <ArcGroupBlock key={g.group} {...g} {...rowProps} />
                    ))}
                </div>
            </section>
        </div>
    );
};
