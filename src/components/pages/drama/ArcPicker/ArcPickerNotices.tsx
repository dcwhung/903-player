/* 短篇 chips 嘅即將上架 chip 同成套劇快將下架標籤（P8 #6，_mockups_/coming-soon ① ⑧） */
import { ClockIcon, HourglassIcon } from '../../../shared/common/icons/icons';
import styles from './ArcPicker.module.css';

export const NOTICE_ICON_SIZE = 12;

/** 即將上架嘅短篇：排最尾、虛線框淡底 +「⏱ 12/11 上架」，撳唔到 */
export interface UpcomingChip {
    arc: string;
    /** 「12/11 上架」/「明日上架」 */
    text: string;
    /** 讀屏：「XXX，12/11（四）上架，未可以收聽」 */
    label: string;
}

/** chips 上面嗰行嘅成套劇快將下架字：未開始聽就取代標籤（replace），聽緊就接喺標籤後面 */
export interface ArcPickerNotice {
    text: string;
    replace: boolean;
}

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

/** chips 上面嗰行：成套劇快將下架未開始聽就淨係講下架；聽緊就喺標籤後面接琥珀字（唔會俾 … 切走） */
export const PickerLabel = ({
    label,
    notice,
}: {
    label: string;
    notice: ArcPickerNotice | undefined;
}) => (
    <span className={styles.label}>
        {!notice?.replace && <span className={styles.labelText}>{label}</span>}
        {notice && (
            <span className={styles.notice}>
                <HourglassIcon size={NOTICE_ICON_SIZE} />
                {notice.text}
            </span>
        )}
    </span>
);
