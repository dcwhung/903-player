import { useEffect, useState } from 'react';
import { useMinuteClock } from '../../../../hooks/useMinuteClock';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { AMBIENT_NIGHT, ambientNightState } from '../../../../selectors/ambientNight';
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

/**
 * 實際顯示嘅暗 / 光（data-ambient-night）：轉要 CSS transition（--ambient-night-fade）有起點，
 * 所以等兩格 frame（日間嘅樣畫咗）先跟 target；mount 嗰下一律由日間開始，除非 startAtTarget（時間到）。
 * 減少動態：喺轉嗰刻先睇設定（CLAUDE.md Motion），即刻切換
 */
export const useNightFade = (target: boolean, startAtTarget: boolean): boolean => {
    const [shown, setShown] = useState(() => startAtTarget && target);
    // 減少動態：render 期間即刻跟（唔經 effect / frame），commit 嗰次已經係新狀態
    if (shown !== target && prefersReducedMotion()) setShown(target);
    useEffect(() => {
        if (shown === target) return undefined;
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => setShown(target));
        });
        return () => cancelAnimationFrame(frame);
    }, [target, shown]);
    return shown;
};

/** 閒置畫面覆蓋層用：暗定光（已經計埋 mount 淡入同時間到即刻暗） */
export const useAmbientNight = (acknowledgedExpiryAt: number | null): boolean => {
    const { night, expiredByTimer } = useAmbientNightTarget(acknowledgedExpiryAt);
    return useNightFade(night, expiredByTimer);
};
