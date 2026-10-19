import { createContext } from 'react';
import type { Recording } from '../types/recording';

export interface LoadOptions {
    autoplay?: boolean;
}

export interface PlayerState {
    recording: Recording | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    /** 每次有錄音變成「聽過」就 +1，令顯示剔嘅 component 重新 render */
    watchedRevision: number;
}

export interface PlayerActions {
    load: (recording: Recording, options?: LoadOptions) => Promise<void>;
    toggle: () => Promise<void>;
    restart: () => Promise<void>;
    seek: (seconds: number) => void;
    skip: (deltaSeconds: number) => void;
    stop: () => void;
}

export type PlayerContextValue = PlayerState & PlayerActions;

export const PlayerContext = createContext<PlayerContextValue | null>(null);
