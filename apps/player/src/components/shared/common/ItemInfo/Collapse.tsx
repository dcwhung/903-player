import type { ReactNode } from 'react';
import styles from './Collapse.module.css';

interface CollapseProps {
    expanded: boolean;
    children: ReactNode;
}

/**
 * 展開 / 收埋一段資料：grid-template-rows 0fr → 1fr（唔用 JS 量高度，減少動態直接切換）；
 * 收埋時 inert + aria-hidden，Tab / 讀屏都唔會入去
 */
export const Collapse = ({ expanded, children }: CollapseProps) => (
    <div
        className={styles.collapse}
        data-expanded={expanded}
        inert={!expanded}
        aria-hidden={!expanded}
    >
        <div className={styles.clip}>{children}</div>
    </div>
);
