import { useCallback, useEffect, useId, useRef, type CSSProperties } from 'react';
import { t } from '../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../selectors/arcProgress';
import type { SeriesEpisode } from '../../types/drama';
import { ratio, toPercent } from '../../utils/ratio';
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, RestartIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import { NewBadge } from '../NewBadge/NewBadge';
import { GROUP_TITLES, playLabel, rowLabel, visibleStatus } from './arcLabels';
import styles from './ArcSheet.module.css';
import { useSheetDrag } from './useSheetDrag';

interface ArcSheetProps {
    open: boolean;
    /**
     * 橫版：表只蓋住清單欄（父層要 position: relative），冇遮罩、唔係 modal，旁邊播放器照撳得；
     * 直版（預設）由畫面底彈出蓋全頁
     */
    docked?: boolean;
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
    /** 每行碟面：短篇有自己碟面就用，冇就用劇集主碟面（DramaPage 用 dramaArtFor，同唱片一致） */
    coverOf: (summary: ArcSummary) => string;
}

const CLOSE_ICON_SIZE = 20;
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
const ArcCover = ({ summary: s, cover }: { summary: ArcSummary; cover: string }) => {
    const isDone = s.state === 'done';
    return (
        <span
            className={styles.ring}
            style={
                { '--arc-ring-fill': `${toPercent(ratio(s.watched, s.total))}%` } as CSSProperties
            }
            aria-hidden="true"
        >
            <img className={styles.cover} src={cover} alt="" loading="lazy" decoding="async" />
            {isDone ? (
                <span className={styles.doneBadge} data-role="done">
                    <CheckIcon size={CHECK_ICON_SIZE} />
                </span>
            ) : (
                <span className={styles.count} data-role="count">
                    {`${s.watched}/${s.total}`}
                </span>
            )}
        </span>
    );
};

type RowProps = Pick<ArcSheetProps, 'current' | 'isPlaying' | 'onPick' | 'onPlay' | 'coverOf'> & {
    summary: ArcSummary;
};

/** 一行：左邊撳轉短篇（碟面進度環 + 名 + 進度），右邊播放掣 */
const ArcRow = ({ summary: s, current, isPlaying, onPick, onPlay, coverOf }: RowProps) => {
    const isCurrent = current?.arc === s.arc;
    const status = visibleStatus(s, current);
    return (
        <li className={`${styles.row} ${isCurrent ? styles.current : ''}`}>
            <button
                type="button"
                className={styles.pick}
                data-role="pick"
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={t('drama.arcRow', { arc: s.arc, status: rowLabel(s, current) })}
                onClick={() => onPick(s.arc)}
            >
                <ArcCover summary={s} cover={coverOf(s)} />
                <span className={styles.text} aria-hidden="true">
                    <span className={styles.name}>
                        <Marquee className={styles.nameText} text={s.arc} />
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

/** 表頭「聽完 N / M 個」 */
const sheetProgress = (groups: ArcSheetProps['groups']) => {
    const all = groups.flatMap((g) => g.items);
    return { done: all.filter((s) => s.state === 'done').length, total: all.length };
};

/**
 * 焦點（useSheetFocus）同向下拉閂（useSheetDrag）共用同一張表：
 * 穩定嘅 callback ref 同時填兩邊，唔會每次 render（播放時間每秒更新）重掛
 */
const useSheetBehaviour = (open: boolean, onClose: () => void) => {
    const sheetRef = useSheetFocus(open, onClose);
    const { sheetRef: bindSheet, ...drag } = useSheetDrag(open, onClose);
    const setSheet = useCallback(
        (el: HTMLElement | null) => {
            sheetRef.current = el;
            bindSheet(el);
        },
        [sheetRef, bindSheet],
    );
    return { setSheet, ...drag };
};

/**
 * 全集一覽表（底部彈出）：分組 播放中 → 新上架 → 未聽完 → 已聽完，圓環 = 聽完幾多集；
 * 撳行轉去嗰個短篇，撳右邊掣直接播（續聽 / 未收聽 / ↺ 重聽）。
 * 閂：✕ 掣、撳遮罩、Escape，或者向下拉（grab bar / header；清單捲到頂都得，直版橫版一樣）。
 * 見 design/previews/drama-flow-preview.html；橫版 docked 見 landscape-list-left-preview.html
 */
export const ArcSheet = ({ open, docked = false, groups, onClose, ...rowProps }: ArcSheetProps) => {
    const titleId = useId();
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
    if (!open) return null;
    const progress = sheetProgress(groups);
    return (
        <div className={`${styles.overlay} ${docked ? styles.docked : ''}`}>
            {!docked && (
                <div
                    ref={backdropRef}
                    className={styles.backdrop}
                    data-testid="arc-sheet-backdrop"
                    onClick={onClose}
                />
            )}
            <section
                ref={setSheet}
                className={styles.sheet}
                role="dialog"
                aria-modal={!docked}
                aria-labelledby={titleId}
                tabIndex={-1}
                {...handlers}
            >
                <span className={styles.grab} aria-hidden="true" />
                <header className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {t('drama.sheetTitle')}
                    </h2>
                    <span className={styles.summary}>{t('drama.sheetDone', progress)}</span>
                    <button
                        type="button"
                        className={styles.close}
                        aria-label={t('drama.sheetClose')}
                        onClick={onClose}
                    >
                        <CloseIcon size={CLOSE_ICON_SIZE} />
                    </button>
                </header>
                <div ref={listRef} className={styles.list} data-role="sheet-list">
                    {groups.map((g) => (
                        <ArcGroupBlock key={g.group} {...g} {...rowProps} />
                    ))}
                </div>
            </section>
        </div>
    );
};
