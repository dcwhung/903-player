/* 短篇 chips 嘅即將上架 chip 同成套劇快將下架標籤（P8 #6，_mockups_/coming-soon ① ⑧） */
import { t } from '../../../../i18n/t';
import { ClockIcon, HourglassIcon, ListIcon } from '../../../shared/common/icons/icons';
import styles from './ArcPicker.module.css';

export const NOTICE_ICON_SIZE = 12;
const LIST_ICON_SIZE = 14;

/** 即將上架嘅短篇：排最尾、虛線框淡底 +「⏱ 12/11 上架」，撳唔到 */
export interface UpcomingChip {
    arc: string;
    /** 「12/11 上架」/「明日上架」 */
    text: string;
    /** 讀屏：「XXX，12/11（四）上架，未可以收聽」 */
    label: string;
}

/**
 * 成套劇快將下架：未開始聽（replace）就取代 chips 上面「揀一個短篇開始收聽」（text）；
 * 聽緊就喺「全集」chip 出 LK1 款式小標（tag「⏳ 19/12」，讀屏 label 長版日子），標籤行唔加字
 */
export interface ArcPickerNotice {
    text: string;
    tag: string;
    label: string;
    replace: boolean;
}

/**
 * 「☰ 全集」（釘住左邊）：成套劇快將下架而且已經開始聽，就喺入面加琥珀小標（直版先見；
 * 橫版下架字喺唱片下面，小標收埋）
 */
export const AllChip = ({
    notice,
    onOpenAll,
}: {
    notice: ArcPickerNotice | undefined;
    onOpenAll: () => void;
}) => {
    const tagged = notice && !notice.replace ? notice : undefined;
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
                <span className={`${styles.leavingTag} ${styles.allLeaving}`} aria-hidden="true">
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
        <span>{chip.arc}</span>
        <ClockIcon size={NOTICE_ICON_SIZE} />
        <span>{chip.text}</span>
    </button>
);

/** chips 上面嗰行：成套劇快將下架未開始聽就淨係講下架；聽緊照舊（下架字喺「全集」chip） */
export const PickerLabel = ({
    label,
    notice,
}: {
    label: string;
    notice: ArcPickerNotice | undefined;
}) => (
    <span className={styles.label}>
        {!notice?.replace && <span className={styles.labelText}>{label}</span>}
        {notice?.replace && (
            <span className={styles.notice}>
                <HourglassIcon size={NOTICE_ICON_SIZE} />
                {notice.text}
            </span>
        )}
    </span>
);
