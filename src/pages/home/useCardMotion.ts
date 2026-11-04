import { useLayoutEffect, useRef, useState } from 'react';
import type { PlayerItem } from '../../types/playerItem';
import { isViewTransitionUpdating, withViewTransition } from '../../utils/viewTransition';
import {
    cardFace,
    cardMotion,
    sameCardFace,
    type CardFace,
    type WideLayoutMode,
} from './cardMotion';

/**
 * 闊橫版主頁右邊播放卡嘅過場（_mockups_/player-card-motion：開卡 O1、轉節目 S3）。
 * 版面 / 張卡嘅節目由 player 狀態推出嚟，唔一定係用戶撳嘢（例如開 app 錄音載入完、繼續收聽喺 click 入面
 * 直接開播，iOS 先容許自動播），所以唔包住觸發嘅動作，改為喺 render 攔住：
 * 要過場就先照舊顯示舊畫面（shown），layout effect 開 View Transition，瀏覽器影完舊畫面先 flushSync 轉新。
 * 其他過場嘅 update 入面（撳把手開返、返主頁）render 嘅已經係新畫面，直接跟，唔好開第二個。
 * frozen = 換節目時張卡要定住舊內容（HomeWide 用 memo 唔 re-render），等瀏覽器影低先換；
 * holding = 照顯示緊舊畫面（開卡 / 換節目等緊 update）：HomeWide 連舊版面嘅把手都要留低，O1 時先跟舊 snapshot 淡走
 */
export const useCardMotion = (mode: WideLayoutMode, item: PlayerItem | undefined) => {
    const next = cardFace(mode, item);
    const [shown, setShown] = useState<CardFace>(next);
    const latest = useRef(next);
    /** 自己開咗、update 未行嘅過場（W-526） */
    const waiting = useRef(false);
    const motion = cardMotion(shown, next);
    // render 讀 module global 都安全：app 冇 concurrent rendering（HashRouter useTransitions={false}、冇 startTransition）（S-672）
    const deferred = motion !== null && !isViewTransitionUpdating();
    // 唔使過場：即刻跟（React「props 變就調整 state」寫法，唔會多一次 commit）
    if (!deferred && !sameCardFace(shown, next)) setShown(next);
    useLayoutEffect(() => {
        latest.current = { mode: next.mode, kind: next.kind, id: next.id };
        // 自己嘅過場等緊影舊畫面：佢嘅 update 會用最新嗰個，唔好即刻轉（否則舊 snapshot 已經係新卡，W-526）
        if (!deferred || !motion || waiting.current) return;
        waiting.current = true;
        // update 用最新嗰個：等影舊畫面期間版面 / 節目再變都唔會轉去過時嘅
        const apply = () => {
            waiting.current = false;
            setShown(latest.current);
        };
        // 另一個過場未 update（例如啱啱撳咗 ⤢）：唔做動畫，直接轉
        if (!withViewTransition(apply, motion)) apply();
    }, [deferred, motion, next.mode, next.kind, next.id]);
    return {
        mode: deferred ? shown.mode : mode,
        frozen: deferred && motion === 'switch',
        holding: deferred,
    };
};
