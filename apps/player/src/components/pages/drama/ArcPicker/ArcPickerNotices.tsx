/* 短篇 chips 嘅即將上架 chip 同成套劇快將下架標籤（P8 #6，_mockups_/coming-soon ① ⑧） */
import { arcLabelOf } from '@903-player/catalog';
import { LANDSCAPE_QUERY } from '../../../../config/layout';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { t } from '../../../../i18n/t';
import { ClockIcon, HourglassIcon, ListIcon } from '../../../shared/common/icons/icons';
import { SpokenText } from '../../../shared/common/SpokenText/SpokenText';
import styles from './ArcPicker.module.css';

export const NOTICE_ICON_SIZE = 12;
const LIST_ICON_SIZE = 14;

/** 即將上架嘅短篇：排最尾、虛線框淡底 +「⏱ 12/11 上架」，撳唔到 */
export interface UpcomingChip {
    arc: string;
    /** 顯示名（displayName）；冇就顯示 arc */
    arcLabel?: string | undefined;
    /** 「12/11 上架」/「明日上架」 */
    text: string;
    /** 讀屏：「XXX，12/11 星期四 上架」 */
    label: string;
}

/**
 * 成套劇快將下架：未開始聽（replace）就取代 chips 上面「揀一個短篇開始收聽」（text）；
 * 聽緊就喺「全集」chip 出 LK1 款式小標（tag「⏳ 19/12 下架」，讀屏 label 讀屏日子），標籤行唔加字
 */
export interface ArcPickerNotice {
    text: string;
    tag: string;
    label: string;
    replace: boolean;
}

/**
 * 「☰ 全集」（釘住左邊）：成套劇快將下架而且已經開始聽，就喺入面加琥珀小標同讀屏日子（直版先有）。
 * 橫版下架字喺唱片下面講咗一次（F1：讀屏都只讀一次），chip 唔出小標、讀屏淨係「全集」
 */
export const AllChip = ({
    notice,
    onOpenAll,
}: {
    notice: ArcPickerNotice | undefined;
    onOpenAll: () => void;
}) => {
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const tagged = notice && !notice.replace && !landscape ? notice : undefined;
    const name = t('drama.allArcs');
    return (
        <button
            type="button"
            className={`${styles.chip} ${styles.all}`}
            aria-haspopup="dialog"
            aria-label={
                tagged
                    ? t('availability.arcLeavingLabel', { arc: name, when: tagged.label })
                    : undefined
            }
            onClick={onOpenAll}
        >
            <ListIcon size={LIST_ICON_SIZE} />
            {name}
            {tagged && (
                <span className={styles.leavingTag} aria-hidden="true">
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    {tagged.tag}
                </span>
            )}
        </button>
    );
};

/**
 * 即將上架 chip（_mockups_/coming-soon ① 已揀：虛線框 + 淡底 + ⏱）：aria-disabled（Tab / 讀屏照行到），
 * 冇 click、冇 hover / press 效果，唔會揀中、唔會轉清單
 */
export const SoonChip = ({ chip }: { chip: UpcomingChip }) => (
    <button
        type="button"
        className={`${styles.chip} ${styles.soon}`}
        aria-disabled="true"
        aria-label={chip.label}
    >
        <span>{arcLabelOf(chip)}</span>
        <ClockIcon size={NOTICE_ICON_SIZE} />
        <span>{chip.text}</span>
    </button>
);

/** chips 上面嗰行：成套劇快將下架未開始聽就淨係講下架；聽緊照舊（下架字喺「全集」chip） */
export const PickerLabel = ({
    label,
    spokenLabel,
    notice,
}: {
    label: string;
    /** 讀屏版（唔讀「·」，S-735）；冇或者同畫面一樣就讀畫面字 */
    spokenLabel?: string | undefined;
    notice: ArcPickerNotice | undefined;
}) => (
    <span className={styles.label}>
        {!notice?.replace && (
            <span className={styles.labelText}>
                {/* 讀屏版同畫面一樣（例如「連線中…」）就唔使兩份 */}
                {spokenLabel === undefined || spokenLabel === label ? (
                    label
                ) : (
                    <SpokenText text={label} label={spokenLabel} />
                )}
            </span>
        )}
        {notice?.replace && (
            <span className={styles.notice}>
                <HourglassIcon size={NOTICE_ICON_SIZE} />
                {/* 畫面字有「明日」/「（六）」，讀屏讀讀屏版日子（W-537） */}
                <SpokenText text={notice.text} label={notice.label} />
            </span>
        )}
    </span>
);
