import { useEffect, useState } from 'react';
import { useMinuteClock } from '../../../../hooks/useMinuteClock';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { AMBIENT_NIGHT, ambientNightState } from '../../../../selectors/ambientNight';
import { cssMs } from '../../../../utils/cssTime';
import { prefersReducedMotion } from '../../../../utils/motion';

export interface AmbientNightTarget {
    /** 而家應該係夜間低光 */
    night: boolean;
    /** timer 時間到停咗播、未叫醒過：一出閒置畫面就即刻暗（唔使由日間淡入） */
    expiredByTimer: boolean;
}

/**
 * 閒置畫面應該暗定光（ambientNightState）。timer 開緊時跟 useSleepTimer 每秒更新；
 * 冇 timer（時間到之後）就靠分鐘時鐘 re-render，05:00 嗰分鐘轉返光。
 * acknowledgedExpiryAt：叫醒閒置畫面時記低嗰次時間到（之後再閒置唔再當時間到）
 */
export const useAmbientNightTarget = (acknowledgedExpiryAt: number | null): AmbientNightTarget => {
    const { timer, expiry, now, fraction } = useSleepTimer();
    const minuteNow = useMinuteClock().getTime();
    const unacknowledged = expiry && expiry.at !== acknowledgedExpiryAt ? expiry : null;
    const state = ambientNightState({
        timer: timer ? { startedAt: timer.startedAt, fraction: fraction(now) } : null,
        expiry: unacknowledged,
        now: timer ? now : Math.max(now, minuteNow),
    });
    const night = state === AMBIENT_NIGHT.NIGHT;
    return { night, expiredByTimer: night && timer === null };
};

/** 60 秒夜間過場 token（Ambient.module.css 用同一個）：fading 喺切換後咁耐先拆 */
const NIGHT_FADE_VAR = '--ambient-night-fade';

export interface NightFade {
    /** 實際顯示嘅暗 / 光（data-ambient-night） */
    night: boolean;
    /**
     * 夜間切換緊（data-ambient-night-fading）：淨係呢段時間先有 60 秒過場（W-857），
     * 日間暫停 / 換節目色調照舊即時
     */
    fading: boolean;
}

/** 切換完之後 token 時長先拆 fading（唔靠 transitionend：過場可以畀人取消 / 冇開始） */
const useFadeWindow = (switchCount: number): boolean => {
    const [doneCount, setDoneCount] = useState(switchCount);
    useEffect(() => {
        if (doneCount === switchCount) return undefined;
        const token = getComputedStyle(document.documentElement).getPropertyValue(NIGHT_FADE_VAR);
        const timeout = window.setTimeout(() => setDoneCount(switchCount), cssMs(token));
        return () => window.clearTimeout(timeout);
    }, [switchCount, doneCount]);
    return doneCount !== switchCount;
};

/**
 * 實際顯示嘅暗 / 光：轉要 CSS transition（--ambient-night-fade）有起點，所以先開 fading、
 * 等兩格 frame（日間嘅樣畫咗）先跟 target；mount 嗰下一律由日間開始，除非 startAtTarget（時間到）。
 * 減少動態：喺轉嗰刻先睇設定（CLAUDE.md Motion），即刻切換、冇 fading
 */
export const useNightFade = (target: boolean, startAtTarget: boolean): NightFade => {
    const [shown, setShown] = useState(() => startAtTarget && target);
    const [switchCount, setSwitchCount] = useState(0);
    // 減少動態：render 期間即刻跟（唔經 effect / frame），commit 嗰次已經係新狀態
    if (shown !== target && prefersReducedMotion()) setShown(target);
    useEffect(() => {
        if (shown === target) return undefined;
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                setShown(target);
                setSwitchCount((count) => count + 1);
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [target, shown]);
    const inWindow = useFadeWindow(switchCount);
    return { night: shown, fading: shown !== target || inWindow };
};

/** 閒置畫面覆蓋層用：暗定光 + 切換緊未（已經計埋 mount 淡入同時間到即刻暗） */
export const useAmbientNight = (acknowledgedExpiryAt: number | null): NightFade => {
    const { night, expiredByTimer } = useAmbientNightTarget(acknowledgedExpiryAt);
    return useNightFade(night, expiredByTimer);
};
