import type { KeyboardEvent, ReactNode } from 'react';
import { arrowKeyDirection, type SwipeDirection } from '../../hooks/swipe';
import { useSwipe } from '../../hooks/useSwipe';
import { t } from '../../i18n/t';
import styles from './PlayerPanel.module.css';

interface PlayerTitlesProps {
    title: string;
    dateLabel: string;
    accessory?: ReactNode;
    /** 有傳就變成轉集區：左右掃，或者 focus 咗用左右方向鍵 */
    onStep?: (direction: SwipeDirection) => void;
}

/** 唱片下面嘅日期同節目名；節目頁用嚟做轉集區（跟今日節目輪播一樣用方向鍵代替 swipe） */
export const PlayerTitles = ({ title, dateLabel, accessory, onStep }: PlayerTitlesProps) => {
    const swipe = useSwipe((direction) => onStep?.(direction));
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        // 只係焦點喺轉集區本身先處理，入面嘅掣（例如指示點）有自己用途
        if (direction && event.target === event.currentTarget) onStep?.(direction);
    };
    const zone = onStep && {
        role: 'group',
        'aria-roledescription': t('episodes.switchRoleDescription'),
        'aria-label': t('episodes.switchLabel'),
        tabIndex: 0,
        onKeyDown,
        ...swipe,
    };

    return (
        <div className={`${styles.titles} ${onStep ? styles.switcher : ''}`} {...zone}>
            <span className={styles.date}>{dateLabel}</span>
            <h1 className={styles.title}>{title}</h1>
            {accessory}
        </div>
    );
};
