import {
    useId,
    useLayoutEffect,
    useRef,
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
} from 'react';
import { arrowKeyDirection } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import { DAY_INDEX_ATTR, steppedDay, type StripDay } from './dateStrip';
import { useStepAnnouncement } from './useStepAnnouncement';
import { useStripGesture } from './useStripGesture';
import { useStripMotion } from './useStripMotion';

export interface DateStripStepOptions {
    /** 現正播放嗰日（例如「19/10（一）」）：轉集區個名 + 轉集通知 */
    dateLabel: string;
    /** 由新到舊（左到右）嘅日子，見 stripDays */
    days: readonly StripDay[];
    /** 現正播放嗰日嘅 index，永遠擺喺正中 */
    current: number;
    /** 播嗰日嘅集數（節目頁 selectEpisode：同撳清單一樣即刻播、續播 / 由頭播） */
    onPick: (url: string) => void;
    /** 跟住日子條轉嘅唱片（PlayerPanel 嘅節目圖） */
    spinRef?: RefObject<HTMLElement | null> | undefined;
    /** 拖緊日子條（捉住碟）：畀 PlayerPanel 暫停碟自轉 */
    onHold?: ((held: boolean) => void) | undefined;
}

/**
 * 拖動 / 撳日子 / 方向鍵都行同一條路：揀到另一日有集數就即刻播（動畫同時滑去正中）；
 * 同一日、冇集數或者盡頭就彈返並清空通知
 */
const useStripStep = ({ dateLabel, days, current, onPick, spinRef }: DateStripStepOptions) => {
    const { steps, announcement, markStep } = useStepAnnouncement(dateLabel);
    const motion = useStripMotion(spinRef);
    const currentDate = days[current]?.date;
    const settled = useRef<{ date: string | undefined; steps: number } | null>(null);
    // 轉咗集（steps）或者外面轉咗集（日子變）就滑去新嗰日正中；第一次 render、
    // 或者只係集數清單多咗（例如 probe 搵到新一集，index 變但日子冇變）就直接擺好，唔使滑
    useLayoutEffect(() => {
        const last = settled.current;
        const moved = last !== null && (last.date !== currentDate || last.steps !== steps);
        motion.settle(current, moved);
        settled.current = { date: currentDate, steps };
    }, [current, currentDate, steps, motion]);
    const go = (index: number) => {
        const url = days[index]?.url;
        const moved = index !== current && url !== undefined && url !== null;
        if (moved) {
            motion.commit();
            onPick(url);
        } else {
            motion.springBack();
        }
        markStep(moved);
    };
    return { motion, go, announcement };
};

/** 日子條嘅方向鍵同撳日子：都行 go（同拖動同一條路） */
const useStripInput = ({ days, current }: DateStripStepOptions, go: (index: number) => void) => {
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        // 只係焦點喺日子條本身先處理
        if (!direction || event.target !== event.currentTarget) return;
        event.preventDefault();
        // → 舊一集（右邊）、← 新一集（左邊），同畫面位置一致
        go(steppedDay(days, current, direction));
    };
    // 撳日子：由 track 代理（DayCell 唔使每格一個 callback，可以 memo）；
    // 撳咗嘅掣會變做正中（唔再係掣），焦點交返日子條，方向鍵照用得
    const onTrackClick = (event: MouseEvent<HTMLDivElement>) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>(`[${DAY_INDEX_ATTR}]`);
        if (!cell) return;
        event.currentTarget.parentElement?.focus({ preventScroll: true });
        go(Number(cell.getAttribute(DAY_INDEX_ATTR)));
    };
    return { onKeyDown, onTrackClick };
};

/**
 * 日子條：轉集區名 = 日期 + 節目名（aria-labelledby），操作提示放 aria-describedby，
 * 只有日子條自己觸發嘅轉集先會經 polite live region 讀出嚟。
 */
export const useDateStrip = (options: DateStripStepOptions) => {
    const ids = { date: useId(), title: useId(), hint: useId() };
    const { motion, go, announcement } = useStripStep(options);
    const gesture = useStripGesture({
        days: options.days,
        current: options.current,
        motion,
        onGo: go,
        onHold: options.onHold,
    });
    const { onKeyDown, onTrackClick } = useStripInput(options, go);
    const zone = {
        role: 'group',
        'aria-roledescription': t('episodes.switchRoleDescription'),
        'aria-labelledby': `${ids.date} ${ids.title}`,
        'aria-describedby': ids.hint,
        tabIndex: 0,
        onKeyDown,
        ...gesture,
    };
    return { ids, zone, trackRef: motion.trackRef, onTrackClick, announcement };
};
