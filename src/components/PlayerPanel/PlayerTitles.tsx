import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { arrowKeyDirection, type SwipeDirection } from '../../hooks/swipe';
import { useSwipe } from '../../hooks/useSwipe';
import { t } from '../../i18n/t';
import styles from './PlayerPanel.module.css';

interface PlayerTitlesProps {
    title: string;
    dateLabel: string;
    accessory?: ReactNode;
    /** 有傳就變成轉集區：左右掃，或者 focus 咗用左右方向鍵；返回有冇真係轉集（盡頭唔郁 = false） */
    onStep?: (direction: SwipeDirection) => boolean;
}

/**
 * 「已轉到…」通知：只係轉集區真係觸發咗轉集（pending），之後日期變咗先讀，讀完清走 pending；
 * 其他原因轉集（例如撳清單）或者盡頭唔郁就清空通知。
 * 用「記住上次 props」嘅寫法喺 render 入面更新，唔使 effect。
 */
const useStepAnnouncement = (dateLabel: string) => {
    const [shownDate, setShownDate] = useState(dateLabel);
    const [pending, setPending] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    if (shownDate !== dateLabel) {
        setShownDate(dateLabel);
        setAnnouncement(pending ? t('episodes.switched', { date: dateLabel }) : '');
        setPending(false);
    }
    const markStep = (moved: boolean) => {
        setPending(moved);
        if (!moved) setAnnouncement('');
    };
    return { announcement, markStep };
};

/** 轉集區嘅 props：名就係日期 + 節目名（aria-labelledby），操作提示放 aria-describedby */
const useSwitcher = (dateLabel: string, onStep: PlayerTitlesProps['onStep']) => {
    const ids = { date: useId(), title: useId(), hint: useId() };
    const { announcement, markStep } = useStepAnnouncement(dateLabel);
    const step = (direction: SwipeDirection) => markStep(onStep?.(direction) ?? false);
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
