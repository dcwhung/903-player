import { useId, useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
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
}

/** 拖動 / 撳側格 / 方向鍵都行同一條路：有隔籬集就滑過去再轉，盡頭就彈返並清空通知 */
const useStripStep = ({ dateLabel, neighbours, onStep, spinRef }: DateStripStepOptions) => {
    const { announcement, markStep } = useStepAnnouncement(dateLabel);
    const motion = useStripMotion(spinRef);
    // 滑完先轉集：到時要用最新嘅 onStep（播緊邊集可能已經變咗）
    const onStepRef = useRef(onStep);
    useLayoutEffect(() => {
        onStepRef.current = onStep;
    });
    useLayoutEffect(() => motion.settle(), [dateLabel, motion]);
    const go = (direction: SwipeDirection) => {
        if (neighbourFor(neighbours, direction) === undefined) {
            motion.springBack();
            markStep(false);
            return;
        }
        motion.commit(direction, () => markStep(onStepRef.current(direction)));
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
    const gesture = useStripGesture({ neighbours: options.neighbours, motion, onGo: go });
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
