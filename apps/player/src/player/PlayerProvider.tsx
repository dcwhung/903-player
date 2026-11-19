import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioController, createAudioElement } from './AudioController';
import { PlayerContext, type PlayerActions } from './playerContext';
import { SleepTimerController } from './SleepTimerController';
import { SleepTimerScheduler } from './SleepTimerScheduler';
import { SleepTimerContext, SleepTimerScheduleContext } from './sleepTimerContext';
import type { Track } from '../types/track';
import { useMediaSession } from './useMediaSession';

/** audio 同 controller 只可以揀一個：傳 controller 時 audio 會冇用，所以型別上擋住 */
type PlayerSource =
    | {
          /** 測試時注入假 audio element */
          audio?: HTMLAudioElement;
          controller?: never;
      }
    | {
          audio?: never;
          /** 由 main.tsx 傳入共用 controller，令 React 以外（例如 PWA 更新）都讀到播放狀態 */
          controller?: AudioController;
      };

type PlayerProviderProps = PlayerSource & {
    children: ReactNode;
    /** 播完一集自動接住播邊集（App 傳 nextTrack）；冇就播完停 */
    nextTrack?: (track: Track) => Track | undefined;
};

/**
 * 睡眠 timer（9d）跟住同一個 controller：時間到暫停、「播完呢集」擋自動接下一集；
 * 每晚自動：到排程時間 / 時段內開始播就開 timer（用戶 2026-11-19）
 */
const useSleepTimers = (controller: AudioController) => {
    const [sleepTimer] = useState(() => new SleepTimerController(controller));
    const [schedule] = useState(() => new SleepTimerScheduler(sleepTimer, controller));
    useEffect(() => sleepTimer.attach(), [sleepTimer]);
    useEffect(() => schedule.attach(), [schedule]);
    return { sleepTimer, schedule };
};

/** 全 app 共用一個 audio element，令 iOS 喺用戶 click 時就可以開始播放 */
export const PlayerProvider = ({
    children,
    audio,
    controller: shared,
    nextTrack,
}: PlayerProviderProps) => {
    const [controller] = useState(
        () => shared ?? new AudioController(audio ?? createAudioElement()),
    );
    useEffect(() => controller.attach(), [controller]);
    const { sleepTimer, schedule } = useSleepTimers(controller);
    useEffect(() => controller.setNextTrack(nextTrack), [controller, nextTrack]);
    const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

    // controller 嘅 method 係 arrow property，所以 actions 永遠唔變
    const actions = useMemo<PlayerActions>(
        () => ({
            load: controller.load,
            play: controller.play,
            pause: controller.pause,
            toggle: controller.toggle,
            restart: controller.restart,
            seek: controller.seek,
            skip: controller.skip,
            stop: controller.stop,
        }),
        [controller],
    );
    // 鎖屏專用：卡住時 Play 即刻重新載入，同埋記低鎖屏操作（S-551）
    const remote = useMemo(
        () => ({ resume: controller.resume, log: controller.logRemote }),
        [controller],
    );
    useMediaSession(actions, state, remote);
    const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

    return (
        <PlayerContext.Provider value={value}>
            <SleepTimerContext.Provider value={sleepTimer}>
                <SleepTimerScheduleContext.Provider value={schedule}>
                    {children}
                </SleepTimerScheduleContext.Provider>
            </SleepTimerContext.Provider>
        </PlayerContext.Provider>
    );
};
