import { BulletListIcon } from '../icons/icons';
import styles from './ListButton.module.css';

const LIST_ICON_SIZE = 22;

interface ListButtonProps {
    /** 讀屏名，包埋數量（例如「集數清單，共 4 集」）；badge 數字唔另外讀 */
    label: string;
    /** 右上角 badge 數字（集數 / 今日節目數 / 短篇數）；0 就唔出 badge */
    count: number;
    /** 清單 sheet 開緊：icon 變實色（金底） */
    open: boolean;
    onToggle: () => void;
}

/**
 * 頁頭清單掣（HomeView，P10 lane 6，_mockups_/home-view S5）：喺頁頭右上、ⓘ 左邊，
 * 撳一下開 / 閂清單 sheet（ListSheet）。節目頁、今日節目頁、廣播劇頁共用（lane 7）
 */
export const ListButton = ({ label, count, open, onToggle }: ListButtonProps) => (
    <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
    >
        <BulletListIcon size={LIST_ICON_SIZE} />
        {count > 0 && (
            <span className={styles.badge} aria-hidden="true">
                {count}
            </span>
        )}
    </button>
);
