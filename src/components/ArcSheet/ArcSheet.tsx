import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { t } from '../../i18n/t';
import type { ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { ratio, toPercent } from '../../utils/ratio';
import { formatDuration } from '../../utils/time';
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon } from '../icons/icons';
import styles from './ArcSheet.module.css';

interface ArcSheetProps {
    open: boolean;
    /** 每個短篇嘅進度（聽完嘅已經排最底） */
    summaries: readonly ArcSummary[];
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

type RowProps = Pick<ArcSheetProps, 'current' | 'isPlaying' | 'onPick' | 'onPlay'> & {
    summary: ArcSummary;
};

/** 一行：左邊撳轉短篇（圓環 + 名 + 進度），右邊播放掣 */
const ArcRow = ({ summary: s, current, isPlaying, onPick, onPlay }: RowProps) => {
    const isCurrent = current?.arc === s.arc;
    const status = arcStatus(s, current);
    const showPause = isCurrent && isPlaying;
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
                    <span className={styles.name}>{s.arc}</span>
                    <span className={styles.status}>{status}</span>
                </span>
            </button>
            <button
                type="button"
                className={styles.play}
                aria-label={playLabel(s, isCurrent, isPlaying)}
                onClick={() => onPlay(s)}
            >
                {showPause ? (
                    <PauseIcon size={PLAY_ICON_SIZE} />
                ) : (
                    <PlayIcon size={PLAY_ICON_SIZE} />
                )}
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

/**
 * 「全部短篇」一覽表（底部彈出）：每個短篇一行，圓環 = 聽完幾多集，聽完嘅排最底；
 * 撳行轉去嗰個短篇，撳右邊掣直接播（續聽 / 未收聽 / 重聽）。
 * 見 design/previews/drama-progress-preview.html ① 方案 B
 */
export const ArcSheet = ({ open, summaries, onClose, ...rowProps }: ArcSheetProps) => {
    const titleId = useId();
    const sheetRef = useSheetFocus(open, onClose);
    if (!open) return null;
    const done = summaries.filter((s) => s.state === 'done').length;
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
                        {t('drama.sheetDone', { done, total: summaries.length })}
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
                <ul className={styles.list}>
                    {summaries.map((s) => (
                        <ArcRow key={s.arc} summary={s} {...rowProps} />
                    ))}
                </ul>
            </section>
        </div>
    );
};
