import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioController } from './AudioController';
import { PlayerContext, type PlayerActions } from './playerContext';
import { useMediaSession } from './useMediaSession';

interface PlayerProviderProps {
    children: ReactNode;
    /** 測試時注入假 audio element */
    audio?: HTMLAudioElement;
}

const createAudio = (): HTMLAudioElement => {
    const audio = new Audio();
    audio.preload = 'metadata';
    return audio;
};

/** 全 app 共用一個 audio element，令 iOS 喺用戶 click 時就可以開始播放 */
export const PlayerProvider = ({ children, audio }: PlayerProviderProps) => {
    const [controller] = useState(() => new AudioController(audio ?? createAudio()));
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
