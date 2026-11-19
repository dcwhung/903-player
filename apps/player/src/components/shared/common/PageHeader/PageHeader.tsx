import type { ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import { BackIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import { SleepTimerEntry } from '../../player/SleepTimer/SleepTimerEntry';
import styles from './PageHeader.module.css';
import { useFitText } from './useFitText';

/** 節目名最細縮到幾細（同 --font-size-sm 一樣）；再長就跑馬燈 */
const TITLE_MIN_FONT_PX = 13;

/** 節目名做全頁標題：按畫面闊度自動縮細字體一行顯示；縮到最細都放唔落就跑馬燈 */
const ShowTitle = ({ title }: { title: string }) => {
    const ref = useFitText<HTMLHeadingElement>(title, TITLE_MIN_FONT_PX);
    return (
        <h1 ref={ref} className={styles.showTitle}>
            <Marquee text={title} />
        </h1>
    );
};

interface PageHeaderProps {
    title: string;
    onBack: () => void;
    /** label：細階大楷標籤（預設）；title：節目頁用節目名做全頁標題（h1，太長就縮細字體） */
    variant?: 'label' | 'title';
    /** 標題右邊嘅嘢（例如手機打橫今日節目頁嘅指示點）；冇就留返同返回掣一樣闊嘅空位，標題置中 */
    trailing?: ReactNode;
}

/** 右格有冇嘢（清單掣 + ⓘ、指示點）：有就月亮擺佢左邊 */
const hasContent = (node: ReactNode): boolean =>
    node !== undefined && node !== null && typeof node !== 'boolean';

/**
 * 頁頭：返回掣 + 標題 + 右格。睡眠 timer 月亮掣（9d）絕對定位喺右格（唔佔格），現有頁頭元素位置唔變；
 * DOM 喺右格嘅嘢前面：同畫面一樣由左至右（Tab / 讀屏次序），清單掣 / ⓘ 照舊係最右嗰粒。
 * 日間冇 timer 就完全唔出
 */
export const PageHeader = ({ title, onBack, variant = 'label', trailing }: PageHeaderProps) => (
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
        <SleepTimerEntry placement={hasContent(trailing) ? 'beside' : 'header'} />
        {trailing ?? <span aria-hidden="true" />}
    </header>
);
