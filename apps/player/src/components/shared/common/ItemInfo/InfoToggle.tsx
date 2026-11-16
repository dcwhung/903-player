import { ChevronIcon } from '../icons/icons';
import styles from './InfoToggle.module.css';

interface InfoToggleProps {
    expanded: boolean;
    /** 讀屏名（淨 icon 冇字）：「劇集資料」/「節目資料」 */
    label: string;
    onToggle: () => void;
    className?: string | undefined;
}

const CHEVRON_SIZE = 20;

/** 「全集」/「節目表」旁邊嘅箭咀：撳一下順時針轉 90° 展開資料，再撳轉返收埋 */
export const InfoToggle = ({ expanded, label, onToggle, className = '' }: InfoToggleProps) => (
    <button
        type="button"
        className={`${styles.toggle} ${className}`}
        aria-expanded={expanded}
        aria-label={label}
        onClick={onToggle}
    >
        <ChevronIcon size={CHEVRON_SIZE} />
    </button>
);
