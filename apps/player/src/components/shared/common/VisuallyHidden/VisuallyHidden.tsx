/*
 * 畫面唔顯示、讀屏照讀嘅一段字（S-724）：讀屏版句子（SpokenText）、成個收藏區共用嘅移除提示、
 * 版本號讀屏字都用呢粒，隱藏樣式得一份
 */
import type { ReactNode } from 'react';
import styles from './VisuallyHidden.module.css';

interface VisuallyHiddenProps {
    children: ReactNode;
    /** 俾 aria-describedby / aria-labelledby 指過嚟 */
    id?: string;
}

export const VisuallyHidden = ({ children, id }: VisuallyHiddenProps) => (
    <span id={id} className={styles.hidden}>
        {children}
    </span>
);
