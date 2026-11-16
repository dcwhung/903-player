import type { ReactNode } from 'react';
import { InfoIcon } from '../../common/icons/icons';
import styles from './PlayerPanel.module.css';

interface GaugeInfoRowProps {
    /** 冇就唔出 ⓘ，唱片照舊（唔包多一層） */
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
export const GaugeInfoRow = ({ onInfo, label, children }: GaugeInfoRowProps) => {
    if (!onInfo) return children;
    return (
        <div className={styles.infoRow}>
            {children}
            <button type="button" className={styles.info} aria-label={label} onClick={onInfo}>
                <InfoIcon size={INFO_ICON_SIZE} />
            </button>
        </div>
    );
};
