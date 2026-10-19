import { t } from '../../i18n/t';
import { CheckIcon } from '../icons/icons';
import styles from './WatchedBadge.module.css';

const BADGE_ICON_SIZE = 12;

/** 聽過嘅剔，貼喺父元素右上角（父元素要 position: relative） */
export const WatchedBadge = () => (
    <span className={styles.badge} role="img" aria-label={t('dates.watched')}>
        <CheckIcon size={BADGE_ICON_SIZE} />
    </span>
);
