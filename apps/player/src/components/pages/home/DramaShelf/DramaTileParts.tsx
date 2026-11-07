/* 劇集格嘅部件：「繼續收聽」掣、左上角「新」+ 快將下架（P8 #6，_mockups_/coming-soon ⑧）；灰格喺 UpcomingTile */
import { toPercent } from '../../../../utils/ratio';
import { ClockIcon, HourglassIcon, PlayIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { NewBadge } from '../../../shared/common/NewBadge/NewBadge';
import { Separator } from '../../../shared/common/Separator/Separator';
import { t } from '../../../../i18n/t';
import styles from './DramaShelf.module.css';
import { fitsInParent, useHideWhenTight, type Fits } from './useHideWhenTight';
import type { ContinueButtonProps, DramaShelfItem } from './dramaTileTypes';

const CONTINUE_ICON_SIZE = 16;
const NOTICE_ICON_SIZE = 12;
// 單獨左上角放唔落：第 1 步「⏳ 19/12 下架」、第 2 步「⏳ 19/12」
const LONE_CORNER_STEPS = 2;

/**
 * 入頁掣讀屏名（F3 / D4）：「劇名，有新上架短篇；全新短篇 02/12 星期三 上架；部分短篇 05/12 星期六 下架」，
 * 冇嘢補充就淨係劇名
 */
export const tileLabel = ({ name, newLabel, leaving, release }: DramaShelfItem): string => {
    const notes = [newLabel, release?.label, leaving?.label].filter(Boolean);
    if (notes.length === 0) return name;
    const label = notes.join(t('availability.noteSeparator'));
    return t('availability.tileWithNote', { name, label });
};

interface NoteForms {
    /** 夠位：全句 */
    text: string;
    /** 格窄（280px 以下）：短版（「05/12 下架」/「後日上架」） */
    tag: string | undefined;
    /** 再窄（200px 以下）先出嘅最短版（「05/12」，E2）；冇就停喺 tag */
    narrow?: string | undefined;
}

/** 字同佢嘅短版：格窄（container query）先換做短版，再窄先淨日期 */
const FullOrTag = ({ text, tag, narrow }: NoteForms) => (
    <>
        <span className={styles.noteFull}>{text}</span>
        <span className={styles.noteTag}>{tag ?? text}</span>
        {narrow && <span className={styles.noteNarrow}>{narrow}</span>}
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
                <Separator />
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
    const label = t('drama.tileContinue', { name, label: resume.spokenLabel });
    return resume.leaving
        ? t('availability.withLeaving', { label, when: resume.leaving.label })
        : label;
};

/** 集名（全長）+ 間距 + 下架字放唔放得落條入面：放唔落就收埋下架字，集名優先 */
const continueFits: Fits = (line) => {
    const text = line.querySelector<HTMLElement>('[data-marquee-text]');
    const leaving = line.querySelector<HTMLElement>('[data-role="continue-leaving"]');
    const gap = parseFloat(getComputedStyle(line).columnGap) || 0;
    return (text?.scrollWidth ?? 0) + gap + (leaving?.offsetWidth ?? 0) <= line.clientWidth;
};

/** 集名一行 + 下架字（LC2）；放唔落成段收埋下架字（讀屏照講） */
const ContinueLine = ({ resume }: { resume: ContinueButtonProps['resume'] }) => {
    const lineRef = useHideWhenTight<HTMLSpanElement>(resume.leaving !== undefined, continueFits);
    return (
        <span ref={lineRef} className={styles.continueLine} data-continue-line="">
            <Marquee className={styles.continueLabel} text={resume.label} />
            {resume.leaving && (
                <span className={styles.continueLeaving} data-role="continue-leaving">
                    <Separator />
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    {resume.leaving.text}
                </span>
            )}
        </span>
    );
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
        <ContinueLine resume={resume} />
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
    // 冇頂行（冇繼續收聽）：左上角自己對格闊量，放唔落先換短版、再淨日期（W-538）；
    // 有頂行就由右上角嗰粒量（TileCorners TOP_BAR_STEPS）
    const ref = useHideWhenTight<HTMLSpanElement>(
        !item.resume && item.leaving?.short !== undefined,
        fitsInParent,
        LONE_CORNER_STEPS,
    );
    if (!item.newLabel && !item.leaving) return null;
    return (
        <span ref={ref} className={styles.corner} data-corner-notes="">
            {item.newLabel && <NewBadge />}
            {item.leaving && (
                <span className={styles.leaving} data-corner-leaving="">
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    <FullOrTag
                        text={item.leaving.text}
                        tag={item.leaving.short ?? item.leaving.tag}
                        narrow={item.leaving.short ? item.leaving.tag : undefined}
                    />
                </span>
            )}
        </span>
    );
};
