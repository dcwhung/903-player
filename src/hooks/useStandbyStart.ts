import { usePlayer } from '../player/usePlayer';

/**
 * player 載入緊其他嘢（播緊或者暫停緊）而唔係呢頁：唱片係未開始樣，撳播放先開始播呢頁（換走其他嘢）。
 * 冇嘢載入（等緊自動播）或者載入咗呢頁就係 undefined，唱片跟返 player
 */
export const useStandbyStart = (isLoaded: boolean, start: () => void): (() => void) | undefined => {
    const { recording } = usePlayer();
    return !isLoaded && recording !== null ? start : undefined;
};
