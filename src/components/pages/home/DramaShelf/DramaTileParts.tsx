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

/** 入頁掣讀屏名：劇名（+ 有新嘢）（+ 快將下架） */
export const tileLabel = ({ name, newLabel, leaving }: DramaShelfItem): string => {
    const named = newLabel ? t('drama.tileNew', { name, label: newLabel }) : name;
    return leaving ? t('availability.tileLeaving', { name: named, label: leaving.label }) : named;
};

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
                    {item.leaving.text}
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
