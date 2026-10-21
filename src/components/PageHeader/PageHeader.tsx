import { t } from '../../i18n/t';
import { BackIcon } from '../icons/icons';
import styles from './PageHeader.module.css';
import { useFitText } from './useFitText';

/** 節目名最細縮到幾細（同 --font-size-sm 一樣）；再長就由 CSS 省略號處理 */
const TITLE_MIN_FONT_PX = 13;

/** 節目名做全頁標題：按畫面闊度自動縮細字體，一行完整顯示 */
const ShowTitle = ({ title }: { title: string }) => {
    const ref = useFitText<HTMLHeadingElement>(title, TITLE_MIN_FONT_PX);
    return (
        <h1 ref={ref} className={styles.showTitle}>
            {title}
        </h1>
    );
};

interface PageHeaderProps {
    title: string;
    onBack: () => void;
    /** label：細階大楷標籤（預設）；title：節目頁用節目名做全頁標題（h1，太長就縮細字體） */
    variant?: 'label' | 'title';
}

export const PageHeader = ({ title, onBack, variant = 'label' }: PageHeaderProps) => (
    <header className={styles.header}>
        <button
            type="button"
            className={styles.back}
            aria-label={t('common.back')}
            onClick={onBack}
        >
            <BackIcon />
        </button>
        {/* 冇節目名（例如搵唔到節目）就唔出空嘅 h1 */}
        {variant === 'title' && title ? (
            <ShowTitle title={title} />
        ) : (
            <span className={styles.title}>{title}</span>
        )}
        <span aria-hidden="true" />
    </header>
);
