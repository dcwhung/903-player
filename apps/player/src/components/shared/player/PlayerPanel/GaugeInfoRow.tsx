import type { ReactNode } from 'react';
import { INFO_OPENER_ATTR } from '../../common/ItemInfo/ItemInfoSheet';
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

/**
 * 唱片圈頂嗰行右邊嘅 ⓘ（P9.5 #12）：成行闊（唔係唱片闊），離右邊同頁頭返回掣離左邊一樣，
 * 直版橫版同一位置；冇底色，icon 用主題強調色
 */
export const GaugeInfoRow = ({ onInfo, label, children }: GaugeInfoRowProps) => (
    // S-1014：一律包 wrapper，淨係條件 render ⓘ；短篇之間轉（有 / 冇資料）唔會 remount Disc / ArcSlider
    <div className={styles.infoRow}>
        {children}
        {onInfo && (
            <button
                type="button"
                className={styles.info}
                aria-label={label}
                onClick={onInfo}
                {...{ [INFO_OPENER_ATTR]: '' }}
            >
                <InfoIcon size={INFO_ICON_SIZE} />
            </button>
        )}
    </div>
);
