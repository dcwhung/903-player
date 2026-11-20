import { useCallback, useEffect, useRef, useState } from 'react';

/** 算係「有操作」嘅事件：撳 / 掂、鍵盤、滾輪 */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** capture：底下嘅掣 stopPropagation 都聽到；passive：唔阻住捲動 */
const ACTIVITY_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

export interface IdleState {
    /** 咁耐冇操作 */
    idle: boolean;
    /** 叫醒：返非閒置，由頭再計（例如閒置畫面撳咗叫醒） */
    wake: () => void;
}

interface ActivityWatch {
    reset: () => void;
    stop: () => void;
}

/** 開始計時 + 聽操作：有操作 / 返前台就 setIdle(false) 再由頭計，timeoutMs 冇操作就 setIdle(true) */
const watchActivity = (timeoutMs: number, setIdle: (idle: boolean) => void): ActivityWatch => {
    let timeout = setTimeout(() => setIdle(true), timeoutMs);
    const reset = () => {
        setIdle(false);
        clearTimeout(timeout);
        timeout = setTimeout(() => setIdle(true), timeoutMs);
    };
    const onVisibility = () => {
        if (document.visibilityState === 'visible') reset();
    };
    ACTIVITY_EVENTS.forEach((type) =>
        window.addEventListener(type, reset, ACTIVITY_LISTENER_OPTIONS),
    );
    document.addEventListener('visibilitychange', onVisibility);
    const stop = () => {
        clearTimeout(timeout);
        ACTIVITY_EVENTS.forEach((type) =>
            window.removeEventListener(type, reset, ACTIVITY_LISTENER_OPTIONS),
        );
        document.removeEventListener('visibilitychange', onVisibility);
    };
    return { reset, stop };
};

const NO_OP = () => {};

/**
 * 閒置偵測（9b HomeView 閒置畫面）：timeoutMs 內冇操作就 idle；
 * 有操作、或者切走再返嚟（visibilitychange 返 visible）就 reset 由頭計。
 * enabled false 時唔註冊 listener、唔開 timer，idle 一定係 false
 */
export const useIdle = (timeoutMs: number, enabled: boolean): IdleState => {
    const [idle, setIdle] = useState(false);
    const resetRef = useRef<() => void>(NO_OP);

    useEffect(() => {
        if (!enabled) return undefined;
        const watch = watchActivity(timeoutMs, setIdle);
        resetRef.current = watch.reset;
        return () => {
            watch.stop();
            resetRef.current = NO_OP;
            // 停用 / 改 timeout：清返 idle，下次啟用由非閒置開始計
            setIdle(false);
        };
    }, [timeoutMs, enabled]);

    const wake = useCallback(() => resetRef.current(), []);
    return { idle: enabled && idle, wake };
};
