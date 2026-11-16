import { useId } from 'react';
import styles from './InfoChips.module.css';

interface InfoChipsProps {
    /** 「主持」/「聲演」：畫面細字標籤，亦係張 list 嘅讀屏名 */
    label: string;
    names: readonly string[];
    /** inline：標籤同 chip 同一行（全集 / 今日節目行）；stacked：標籤喺上面（資料 sheet） */
    layout: 'inline' | 'stacked';
}

/** 主持 / 聲演圓角 chip：純顯示，唔可以撳 */
export const InfoChips = ({ label, names, layout }: InfoChipsProps) => {
    const labelId = useId();
    return (
        <div className={`${styles.chips} ${styles[layout]}`}>
            <span id={labelId} className={styles.role}>
                {label}
            </span>
            <ul className={styles.list} aria-labelledby={labelId}>
                {names.map((name) => (
                    <li key={name} className={styles.chip}>
                        {name}
                    </li>
                ))}
            </ul>
        </div>
    );
};
