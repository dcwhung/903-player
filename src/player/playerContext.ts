import { createContext } from 'react';
import type { Track } from '../types/track';

export interface LoadOptions {
    autoplay?: boolean;
}

export interface PlayerState {
    /** 載入咗嘅節目錄音或者廣播劇一集 */
    recording: Track | null;
    isPlaying: boolean;
    /** 真正出緊聲（播緊而位置真係行緊，S-551）；撳咗 Play 仲載緊 / 緩衝緊 / 卡住都係 false */
    isAudible: boolean;
    currentTime: number;
    duration: number;
    /** 每次有錄音變成「聽過」就 +1，令顯示剔嘅 component 重新 render */
    watchedRevision: number;
}

export interface PlayerActions {
    load: (recording: Track, options?: LoadOptions) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    toggle: () => Promise<void>;
    restart: () => Promise<void>;
    seek: (seconds: number) => void;
    skip: (deltaSeconds: number) => void;
    stop: () => void;
}

export type PlayerContextValue = PlayerState & PlayerActions;

export const PlayerContext = createContext<PlayerContextValue | null>(null);
