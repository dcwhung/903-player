import type { CSSProperties } from 'react';
import type { SeriesEpisode } from '@903-player/catalog';
import { t } from '../../../../i18n/t';
import type { ArcSummary } from '../../../../selectors/arcProgress';
import { ratio, toPercent } from '../../../../utils/ratio';
import { CheckIcon, PauseIcon, PlayIcon, RestartIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { NewBadge } from '../../../shared/common/NewBadge/NewBadge';
import { playLabel, rowLabel, visibleStatus } from './arcLabels';
import styles from './ArcSheet.module.css';
import type { ArcRowNotes } from './arcSheetTypes';

/** 一行要嘅 props；ArcSheetProps 由呢度組合，避免 ArcRow ↔ ArcSheet 型別循環 */
export interface ArcRowProps {
    summary: ArcSummary;
    /** 載入緊嘅一集（屬於邊個短篇就框住嗰行） */
    current: SeriesEpisode | undefined;
    isPlaying: boolean;
    /** 撳一行：轉去睇嗰個短篇嘅集數 */
    onPick: (arc: string) => void;
    /** 撳右邊掣：播嗰個短篇（續聽 / 未收聽 / 重聽；播緊嗰個就暫停 / 繼續） */
    onPlay: (summary: ArcSummary) => void;
    /** 每行碟面：短篇有自己碟面就用，冇就用劇集主碟面（DramaPage 用 dramaArtFor，同唱片一致） */
    coverOf: (summary: ArcSummary) => string;
    /** 上架 / 下架補充（A2 逐集上架、LS2 快將下架）；冇就同以前一樣 */
    notesOf?: ((summary: ArcSummary) => ArcRowNotes | undefined) | undefined;
}

const PLAY_ICON_SIZE = 18;
const CHECK_ICON_SIZE = 12;

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

/**
 * 碟面 + 外圈進度環（--arc-ring-fill = 聽完集數佔幾多）；未聽完碟面底中間有「1/4」pill，
 * 聽完冇 pill、右下角出 ✓。成粒係裝飾（aria-hidden），狀態喺行嘅 aria-label
 */
const ArcCover = ({
    summary: s,
    cover,
    total = s.total,
}: {
    summary: ArcSummary;
    cover: string;
    /** 分母（A2：有未上架批次就計埋）；聽晒已上架但仲有下一批唔算聽完 */
    total?: number | undefined;
}) => {
    const isDone = s.state === 'done' && total === s.total;
    return (
        <span
            className={styles.ring}
            style={{ '--arc-ring-fill': `${toPercent(ratio(s.watched, total))}%` } as CSSProperties}
            aria-hidden="true"
        >
            <img className={styles.cover} src={cover} alt="" loading="lazy" decoding="async" />
            {isDone ? (
                <span className={styles.doneBadge} data-role="done">
                    <CheckIcon size={CHECK_ICON_SIZE} />
                </span>
            ) : (
                <span className={styles.count} data-role="count">
                    {`${s.watched}/${total}`}
                </span>
            )}
        </span>
    );
};

/** 一行：左邊撳轉短篇（碟面進度環 + 名 + 進度），右邊播放掣 */
export const ArcRow = ({
    summary: s,
    current,
    isPlaying,
    onPick,
    onPlay,
    coverOf,
    notesOf,
}: ArcRowProps) => {
    const isCurrent = current?.arc === s.arc;
    const notes = notesOf?.(s);
    const status = visibleStatus(s, current, notes);
    return (
        <li className={`${styles.row} ${isCurrent ? styles.current : ''}`}>
            <button
                type="button"
                className={styles.pick}
                data-role="pick"
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={t('drama.arcRow', { arc: s.arc, status: rowLabel(s, current, notes) })}
                onClick={() => onPick(s.arc)}
            >
                <ArcCover summary={s} cover={coverOf(s)} total={notes?.total} />
                <span className={styles.text} aria-hidden="true">
                    <span className={styles.name}>
                        <Marquee className={styles.nameText} text={s.arc} />
                        {s.isNew && <NewBadge size="sm" className={styles.fresh} />}
                        {notes?.badge && <span className={styles.leavingBadge}>{notes.badge}</span>}
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
