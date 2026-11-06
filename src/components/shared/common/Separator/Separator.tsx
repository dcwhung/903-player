/* 分隔符「 · 」（G2）：全 app 一個，字眼喺 i18n common.separator，唔寫死喺 CSS content / join */
import { t } from '../../../../i18n/t';
import styles from './Separator.module.css';

/** 裝飾：讀屏唔讀（讀屏句由各自嘅 label 砌） */
export const Separator = ({ className }: { className?: string }) => (
    <span
        className={className ? `${styles.separator} ${className}` : styles.separator}
        aria-hidden="true"
    >
        {t('common.separator')}
    </span>
);
