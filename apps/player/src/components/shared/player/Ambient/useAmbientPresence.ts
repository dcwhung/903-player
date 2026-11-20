import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type SyntheticEvent,
} from 'react';
import { AMBIENT_IDLE_MS } from '../../../../config/constants';
import { useIdle } from '../../../../hooks/useIdle';
import { canShowAmbient, type AmbientEligibility } from '../../../../selectors/ambient';
import { hasOpenModalDialog } from '../../../../utils/modalDialog';
import { prefersReducedMotion } from '../../../../utils/motion';

/**
 * pointerup 之後等 click 最多幾耐：正常 click 喺 pointerup 後即刻到；拖咗 / 瀏覽器唔出 click 就靠呢個收起，
 * 唔會卡喺「叫醒緊」
 */
export const WAKE_CLICK_GRACE_MS = 500;

/** none = 冇出；shown = 出緊；waking = 撳落咗未放手（覆蓋層照接住 pointerup / click）；leaving = 淡出緊 */
type Phase = 'none' | 'shown' | 'waking' | 'leaving';

export interface AmbientPresence {
    /** 要 render 覆蓋層（出緊或者淡出緊） */
    present: boolean;
    /** 淡出緊：唔接 tap、底下嗰頁已經唔 inert */
    leaving: boolean;
    /** 淡出完（useLeaveFallback）：拆走 */
    onLeft: () => void;
    /** 覆蓋層嘅事件：第一下只係叫醒，唔傳落底下 */
    handlers: {
        onPointerDown: (event: SyntheticEvent) => void;
        onPointerUp: (event: SyntheticEvent) => void;
        onPointerCancel: () => void;
        onClick: (event: SyntheticEvent) => void;
        onKeyDown: (event: KeyboardEvent) => void;
        onWheel: () => void;
    };
}

/** 食咗呢下：唔做預設動作（click / 鍵盤啟動）、唔傳去 document 上面嘅 listener */
const swallow = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
};

interface WakeControls {
    /** 收起（淡出或者即刻）+ 由頭計 30 秒 */
    finish: () => void;
    setPhase: (phase: Phase) => void;
}

/** 覆蓋層事件：撳落入 waking；click / 鍵盤 / 滾輪 / pointercancel 收起；pointerup 後等唔到 click 都收起 */
const useWakeHandlers = ({ finish, setPhase }: WakeControls): AmbientPresence['handlers'] => {
    const graceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(graceTimer.current), []);
    return useMemo(() => {
        const done = () => {
            clearTimeout(graceTimer.current);
            finish();
        };
        const swallowAndFinish = (event: SyntheticEvent) => {
            swallow(event);
            done();
        };
        return {
            onPointerDown: (event: SyntheticEvent) => {
                swallow(event);
                setPhase('waking');
            },
            onPointerUp: (event: SyntheticEvent) => {
                event.stopPropagation();
                clearTimeout(graceTimer.current);
                graceTimer.current = setTimeout(done, WAKE_CLICK_GRACE_MS);
            },
            onPointerCancel: done,
            onClick: swallowAndFinish,
            onKeyDown: swallowAndFinish,
            onWheel: done,
        };
    }, [finish, setPhase]);
};

/**
 * 覆蓋層階段，render 期間調整（唔經 effect）：
 * - 一閒置到就鎖住 shown：之後 idle 變返 false（useIdle 喺 window capture 聽 pointerdown，佢嘅 update 喺
 *   覆蓋層自己收到 pointerdown 之前已經 flush 咗）都唔會即刻拆走，要經叫醒（finish）先收起
 * - 冇嘢載住 / 撥走咗：即刻收起，唔留住任何階段
 */
const useAmbientPhase = (enabled: boolean, idleShown: boolean) => {
    const [phase, setPhase] = useState<Phase>('none');
    const [wasEnabled, setWasEnabled] = useState(enabled);
    if (wasEnabled !== enabled) {
        setWasEnabled(enabled);
        if (!enabled) setPhase('none');
    }
    if (enabled && idleShown && (phase === 'none' || phase === 'leaving')) setPhase('shown');
    return [phase, setPhase] as const;
};

/**
 * 閒置畫面幾時出（9b，用戶 2026-11-20）：30 秒冇操作 + 有嘢載住 + mini player 冇撥走 + 冇其他 modal 開緊。
 * 叫醒：撳落即刻入 waking，等到 click 先收起，咁 pointerup / click 都落喺覆蓋層，唔會撳中底下嘅掣；
 * 收起時 wake() 由頭計 30 秒。其他 modal 喺閒置嗰刻先睇一次（useMemo [idle]）：嗰陣覆蓋層未出，唔會數到自己
 */
export const useAmbientPresence = (
    eligibility: Omit<AmbientEligibility, 'modalOpen'>,
    /** 叫醒嗰下（覆蓋層仲喺度，未開始淡出）：9c 量夜間暗度開遮罩 */
    onWake?: () => void,
): AmbientPresence => {
    const enabled = canShowAmbient({ ...eligibility, modalOpen: false });
    const { idle, wake } = useIdle(AMBIENT_IDLE_MS, enabled);
    const modalOpen = useMemo(() => idle && hasOpenModalDialog(), [idle]);
    const [phase, setPhase] = useAmbientPhase(
        enabled,
        idle && canShowAmbient({ ...eligibility, modalOpen }),
    );
    const finish = useCallback(() => {
        onWake?.();
        // 減少動態：即刻收起，唔淡出（CLAUDE.md Motion）
        setPhase(prefersReducedMotion() ? 'none' : 'leaving');
        wake();
    }, [wake, setPhase, onWake]);
    const handlers = useWakeHandlers({ finish, setPhase });
    return {
        present: enabled && phase !== 'none',
        leaving: phase === 'leaving',
        onLeft: useCallback(() => setPhase('none'), [setPhase]),
        handlers,
    };
};
