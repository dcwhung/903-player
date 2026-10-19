import { useState } from 'react';
import { t } from '../../i18n/t';

/**
 * 「已轉到…」通知：只係日子條真係觸發咗轉集（pending），之後日期變咗先讀，讀完清走 pending；
 * 其他原因轉集（例如撳清單）或者盡頭唔郁就清空通知。
 * 用「記住上次 props」嘅寫法喺 render 入面更新，唔使 effect。
 */
export const useStepAnnouncement = (dateLabel: string) => {
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
