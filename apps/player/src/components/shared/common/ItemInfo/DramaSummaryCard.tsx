import { t } from '../../../../i18n/t';
import { Collapse } from './Collapse';
import styles from './DramaSummaryCard.module.css';

/** 全集 sheet 清單頂嘅劇集簡介卡（同短篇資料一齊展開 / 收埋） */
export const DramaSummaryCard = ({ summary, expanded }: { summary: string; expanded: boolean }) => (
    <Collapse expanded={expanded}>
        <div className={styles.card}>
            <p className={styles.label}>{t('info.summary')}</p>
            <p className={styles.text}>{summary}</p>
        </div>
    </Collapse>
);
