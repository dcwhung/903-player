import type { PointerEvent } from 'react';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';

/** 由呢啲開始嘅拖動唔當轉節目：唱片格（拖弧形 seek、捽碟）同清單（上下捲） */
const OWN_GESTURES = '[data-player-gauge], ul';

/**
 * 播放卡左右掃轉節目（同底部 mini player 一樣循環）；得一個節目就唔郁。
 * 掃完嘅 click 由 useSwipe 食咗，唔會順手入頁
 */
export const useCardSwipe = (index: number, total: number, onChange: (index: number) => void) => {
    const swipe = useSwipe((direction) => {
        const next = stepIndex(index, total, direction, { wrap: true });
        if (next !== index) onChange(next);
    });
    return {
        ...swipe,
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            swipe.onPointerDown(event);
            // 唱片格 / 清單自己處理拖動：唔當掃嘅開始；但上面已經清咗「食下一下 click」，
            // 掃完即刻撳播放 / 清單行唔會畀人食咗（W-518）
            if ((event.target as Element).closest(OWN_GESTURES)) swipe.onPointerCancel();
        },
    };
};
