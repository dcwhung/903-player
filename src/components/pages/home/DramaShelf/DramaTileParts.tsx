/* 劇集格嘅部件：「繼續收聽」掣、左上角「新」+ 快將下架、即將上架灰格（P8 #6，_mockups_/coming-soon ⑦ ⑧） */
import { toPercent } from '../../../../utils/ratio';
import { ClockIcon, HourglassIcon, PlayIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { NewBadge } from '../../../shared/common/NewBadge/NewBadge';
import { t } from '../../../../i18n/t';
import styles from './DramaShelf.module.css';
import type {
    ContinueButtonProps,
    DramaShelfItem,
    DramaTileProps,
    TileNotice,
} from './dramaTileTypes';

const CONTINUE_ICON_SIZE = 16;
const NOTICE_ICON_SIZE = 12;
const UPCOMING_ICON_SIZE = 14;

/** 入頁掣讀屏名：劇名（+ 有新嘢）（+ 快將下架）（+ 即將上架） */
export const tileLabel = ({ name, newLabel, leaving, release }: DramaShelfItem): string =>
    [leaving?.label, release?.label].reduce<string>(
        (label, part) =>
            part ? t('availability.tileLeaving', { name: label, label: part }) : label,
        newLabel ? t('drama.tileNew', { name, label: newLabel }) : name,
    );

/** 字同佢嘅短版：格窄（container query）先換做短版 */
const FullOrTag = ({ text, tag }: { text: string; tag: string | undefined }) => (
    <>
        <span className={styles.noteFull}>{text}</span>
        <span className={styles.noteTag}>{tag ?? text}</span>
    </>
);

/**
 * 角落短篇數（「3 個短篇」）+ 即將上架字尾：字尾唔收尾，位唔夠就短篇數先 … （W-533）
 */
export const MetaText = ({ item }: { item: DramaShelfItem }) =>
    item.release ? (
        <>
            <span className={styles.metaCount} data-role="meta-count">
                {item.meta}
            </span>
            <span className={styles.metaRelease} data-role="meta-release">
                <ClockIcon className={styles.noteTag} size={NOTICE_ICON_SIZE} />
                <FullOrTag text={item.release.text} tag={item.release.tag} />
            </span>
        </>
    ) : (
        item.meta
    );

/** 「繼續收聽」讀屏名（+ 嗰集快將下架） */
const continueLabel = (name: string, resume: NonNullable<DramaShelfItem['resume']>): string => {
    const label = t('drama.tileContinue', { name, label: resume.label });
    return resume.leaving
        ? t('availability.withLeaving', { label, when: resume.leaving.label })
        : label;
};

/** 圖底「繼續收聽」條（獨立一粒掣）：短篇 · 集數、進度線、▶；撳落淨係播，唔入頁 */
export const ContinueButton = ({ name, resume, onResume, focusProps }: ContinueButtonProps) => (
    <button
        type="button"
        className={styles.continue}
        aria-label={continueLabel(name, resume)}
        onClick={onResume}
        {...focusProps}
    >
        <span className={styles.continueTitle}>{t('drama.continue')}</span>
        <span className={styles.continueLine}>
            <Marquee className={styles.continueLabel} text={resume.label} />
            {resume.leaving && (
                <span className={styles.continueLeaving}>
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    <span className={styles.leavingFull}>{resume.leaving.text}</span>
                    <span className={styles.leavingTag}>{resume.leaving.tag}</span>
                </span>
            )}
        </span>
        <span className={styles.continueBar}>
            <span data-continue-fill="" style={{ width: `${toPercent(resume.ratio)}%` }} />
        </span>
        <span className={styles.continuePlay}>
            <PlayIcon size={CONTINUE_ICON_SIZE} />
        </span>
    </button>
);

/** 左上角：「新」（有新嘢）+ 琥珀色下架字，同一行由左向右排（_mockups_/coming-soon ⑧） */
export const CornerNotes = ({ item }: { item: DramaShelfItem }) => {
    if (!item.newLabel && !item.leaving) return null;
    return (
        <span className={styles.corner} data-corner-notes="">
            {item.newLabel && <NewBadge />}
            {item.leaving && (
                <span className={styles.leaving}>
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    <FullOrTag text={item.leaving.text} tag={item.leaving.tag} />
                </span>
            )}
        </span>
    );
};

/**
 * 整套劇即將上架（_mockups_/coming-soon ⑦ Z1）：灰階圖 + 底部深色條，冇短篇數、冇繼續收聽。
 * aria-disabled（唔用 disabled，Tab / 讀屏照行到），撳落完全冇反應：唔入頁，直版疊卡亦唔接
 * 撳卡 focus 嘅 handler（唔會撳嚟 focus / 捲動）；捲到佢 snap 位先會變 focus 卡
 */
export const UpcomingTile = ({
    item,
    focus,
}: DramaTileProps & { item: { upcoming: TileNotice } }) => (
    <div
        className={`${styles.tile} ${styles.upcoming}`}
        data-focused={focus?.focused ? '' : undefined}
    >
        <button
            type="button"
            className={styles.open}
            aria-disabled="true"
            aria-label={item.upcoming.label}
        >
            <img className={styles.art} src={item.art} alt="" draggable={false} />
            <span className={styles.upcomingBar} aria-hidden="true">
                <ClockIcon size={UPCOMING_ICON_SIZE} />
                {item.upcoming.text}
            </span>
        </button>
    </div>
);
