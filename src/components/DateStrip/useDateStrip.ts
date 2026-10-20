import { useId, useLayoutEffect, type KeyboardEvent, type RefObject } from 'react';
import { arrowKeyDirection, type SwipeDirection } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import { neighbourFor, type StripNeighbours } from './dateStrip';
import { useStepAnnouncement } from './useStepAnnouncement';
import { useStripGesture } from './useStripGesture';
import { useStripMotion } from './useStripMotion';

export interface DateStripStepOptions {
    dateLabel: string;
    neighbours: StripNeighbours;
    /** 真係轉集，返回有冇轉到（節目頁 stepEpisode：同撳清單一樣即刻播、續播 / 由頭播） */
    onStep: (direction: SwipeDirection) => boolean;
    /** 跟住日子條轉嘅唱片（PlayerPanel 嘅節目圖） */
    spinRef?: RefObject<HTMLElement | null> | undefined;
    /** 拖緊日子條（捉住碟）：畀 PlayerPanel 暫停碟自轉 */
    onHold?: ((held: boolean) => void) | undefined;
}

/**
 * 拖動 / 撳側格 / 方向鍵都行同一條路：有隔籬集就即刻轉集（即刻播），
 * 動畫同時進行（新日期由隔籬格滑入）；盡頭或者轉唔到就彈返並清空通知
 */
const useStripStep = ({ dateLabel, neighbours, onStep, spinRef }: DateStripStepOptions) => {
    const { steps, announcement, markStep } = useStepAnnouncement(dateLabel);
    const motion = useStripMotion(spinRef);
    // 轉咗集（steps）或者外面轉咗集（日期變）就歸位；唔靠日期，同一日兩集都會歸位
    useLayoutEffect(() => motion.arrive(), [dateLabel, steps, motion]);
    const go = (direction: SwipeDirection) => {
        const moved = neighbourFor(neighbours, direction) !== undefined && onStep(direction);
        // 轉唔到就唔會有新 render 觸發歸位，要自己彈返
        if (moved) motion.commit(direction);
        else motion.springBack();
        markStep(moved);
    };
    return { motion, go, announcement };
};

/**
 * 日子條：轉集區名 = 日期 + 節目名（aria-labelledby），操作提示放 aria-describedby，
 * 只有日子條自己觸發嘅轉集先會經 polite live region 讀出嚟。
 */
export const useDateStrip = (options: DateStripStepOptions) => {
    const ids = { date: useId(), title: useId(), hint: useId() };
    const { motion, go, announcement } = useStripStep(options);
    const gesture = useStripGesture({
        neighbours: options.neighbours,
        motion,
        onGo: go,
        onHold: options.onHold,
    });
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        // 只係焦點喺日子條本身先處理，入面嘅側格掣有自己用途
        if (!direction || event.target !== event.currentTarget) return;
        event.preventDefault();
        go(direction);
    };
    const zone = {
        role: 'group',
        'aria-roledescription': t('episodes.switchRoleDescription'),
        'aria-labelledby': `${ids.date} ${ids.title}`,
        'aria-describedby': ids.hint,
        tabIndex: 0,
        onKeyDown,
        ...gesture,
    };
    return { ids, zone, trackRef: motion.trackRef, go, announcement };
};
