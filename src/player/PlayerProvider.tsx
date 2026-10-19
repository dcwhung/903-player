import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioController, createAudioElement } from './AudioController';
import { PlayerContext, type PlayerActions } from './playerContext';
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

type PlayerProviderProps = PlayerSource & { children: ReactNode };

/** 全 app 共用一個 audio element，令 iOS 喺用戶 click 時就可以開始播放 */
export const PlayerProvider = ({ children, audio, controller: shared }: PlayerProviderProps) => {
    const [controller] = useState(
        () => shared ?? new AudioController(audio ?? createAudioElement()),
    );
    useEffect(() => controller.attach(), [controller]);
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
    useMediaSession(actions, state);
    const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};
