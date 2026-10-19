import { useState } from 'react';
import { t } from '../../i18n/t';

/**
 * 「已轉到…」通知：日子條每次真係轉到集（steps + 1）就讀新日期，
 * 即使隔籬集日期一樣（例如同一日兩集）都會讀；其他原因轉集（例如撳清單，
 * 日期變咗但 steps 冇變）或者盡頭唔郁就清空通知。
 * 用「記住上次 props」嘅寫法喺 render 入面更新，唔使 effect。
 * steps 同時畀日子條做「轉咗集」嘅 key（歸位用），唔靠日期字眼。
 */
export const useStepAnnouncement = (dateLabel: string) => {
    const [steps, setSteps] = useState(0);
    const [shown, setShown] = useState({ dateLabel, steps });
    const [announcement, setAnnouncement] = useState('');
    if (shown.dateLabel !== dateLabel || shown.steps !== steps) {
        setShown({ dateLabel, steps });
        setAnnouncement(shown.steps !== steps ? t('episodes.switched', { date: dateLabel }) : '');
    }
    const markStep = (moved: boolean) => {
        if (moved) setSteps((count) => count + 1);
        else setAnnouncement('');
    };
    return { steps, announcement, markStep };
};
