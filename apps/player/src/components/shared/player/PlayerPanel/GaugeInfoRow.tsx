import type { ReactNode } from 'react';
import { INFO_OPENER_ATTR } from '../../common/ItemInfo/useCloseOnOutsidePress';
import { InfoIcon } from '../../common/icons/icons';
import styles from './PlayerPanel.module.css';

interface GaugeInfoRowProps {
    /** 冇就唔出 ⓘ（wrapper 照包，ⓘ 出現 / 消失唔會 remount 唱片） */
    onInfo?: (() => void) | undefined;
    /** ⓘ 讀屏名：「節目資料」/「劇集資料」 */
    label?: string | undefined;
    children: ReactNode;
}

const INFO_ICON_SIZE = 24;

interface InfoButtonProps {
    onInfo: () => void;
    label: string | undefined;
    className: string | undefined;
}

/**
 * ⓘ 掣：打開節目 / 劇集資料 sheet。標住 INFO_OPENER_ATTR，資料 sheet 開咗之後再撳佢唔當「撳外面」。
 * 唱片圈頂（GaugeInfoRow）同 HomeView 頁頭（P10 lane 6，清單掣右邊）共用
 */
export const InfoButton = ({ onInfo, label, className }: InfoButtonProps) => (
    <button
        type="button"
        className={className}
        aria-label={label}
        onClick={onInfo}
        {...{ [INFO_OPENER_ATTR]: '' }}
    >
        <InfoIcon size={INFO_ICON_SIZE} />
    </button>
);

/**
 * 唱片圈頂嗰行右邊嘅 ⓘ（P9.5 #12）：直版成行闊（唔係唱片闊），離右邊同頁頭返回掣離左邊一樣；
 * 橫版（T7 / T7b）喺進度圈右邊外面、頂同唱片格齊，唔壓住圈亦唔去到闊欄嘅邊（PlayerPanel.module.css）；
 * 冇底色，icon 用主題強調色
 */
export const GaugeInfoRow = ({ onInfo, label, children }: GaugeInfoRowProps) => (
    // S-1014：一律包 wrapper，淨係條件 render ⓘ；短篇之間轉（有 / 冇資料）唔會 remount Disc / ArcSlider
    <div className={styles.infoRow}>
        {children}
        {onInfo && <InfoButton onInfo={onInfo} label={label} className={styles.info} />}
    </div>
);
