import { useEffect, useRef } from 'react';
import { usePlayer } from '../player/usePlayer';

/**
 * isPlaying 由 false 變 true 就叫 onStart（喺任何一頁開始播）。
 * 睇「變 true」而唔係「係 true」：真 audio 嘅 pause 遲啲先到，關閉嗰下 isPlaying 可能仲係 true
 */
export const useOnPlayStart = (onStart: () => void) => {
    const { isPlaying } = usePlayer();
    const wasPlaying = useRef(isPlaying);
    useEffect(() => {
        if (isPlaying && !wasPlaying.current) onStart();
        wasPlaying.current = isPlaying;
    }, [isPlaying, onStart]);
};
