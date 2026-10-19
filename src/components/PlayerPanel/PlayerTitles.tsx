import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
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

/**
 * 轉集區嘅 props：名就係日期 + 節目名（aria-labelledby），操作提示放 aria-describedby。
 * 記低轉集前嘅日期，日期真係變咗先讀出「已轉到…」；去到盡頭唔郁就唔會讀。
 */
const useSwitcher = (dateLabel: string, onStep: PlayerTitlesProps['onStep']) => {
    const ids = { date: useId(), title: useId(), hint: useId() };
    const [stepFrom, setStepFrom] = useState<string | null>(null);
    const step = (direction: SwipeDirection) => {
        setStepFrom(dateLabel);
        onStep?.(direction);
    };
    const swipe = useSwipe(step);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        // 只係焦點喺轉集區本身先處理，入面嘅掣（例如指示點）有自己用途
        if (direction && event.target === event.currentTarget) step(direction);
    };
    const zone = onStep && {
        role: 'group',
        'aria-roledescription': t('episodes.switchRoleDescription'),
        'aria-labelledby': `${ids.date} ${ids.title}`,
        'aria-describedby': ids.hint,
        tabIndex: 0,
        onKeyDown,
        ...swipe,
    };
    const switched = stepFrom !== null && stepFrom !== dateLabel;
    const announcement = switched ? t('episodes.switched', { date: dateLabel }) : '';
    return { ids, zone, announcement };
};

/** 唱片下面嘅日期同節目名；節目頁用嚟做轉集區（跟今日節目輪播一樣用方向鍵代替 swipe） */
export const PlayerTitles = ({ title, dateLabel, accessory, onStep }: PlayerTitlesProps) => {
    const { ids, zone, announcement } = useSwitcher(dateLabel, onStep);
    return (
        <div className={`${styles.titles} ${onStep ? styles.switcher : ''}`} {...zone}>
            <span id={ids.date} className={styles.date}>
                {dateLabel}
            </span>
            <h1 id={ids.title} className={styles.title}>
                {title}
            </h1>
            {accessory}
            {onStep && (
                <>
                    <span id={ids.hint} className={styles.visuallyHidden}>
                        {t('episodes.switchHint')}
                    </span>
                    <span role="status" aria-live="polite" className={styles.visuallyHidden}>
                        {announcement}
                    </span>
                </>
            )}
        </div>
    );
};
