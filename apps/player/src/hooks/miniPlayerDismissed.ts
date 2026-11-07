import { createFlagStore } from './flagStore';
import { useOnPlayStart } from './useOnPlayStart';

/**
 * 主頁 mini player 畀用戶左滑關閉咗未：存喺 module（唔係 component state），
 * 去節目頁再返主頁（HomePage 重新 mount）都記得；重開 app 就 reset，唔記落 localStorage。
 * 清走（再出返）由 App 層面嘅 useRestoreMiniPlayerOnPlay 負責，喺邊一頁開始播都得
 */
const store = createFlagStore();

/** 用戶左滑關閉：收起 mini player */
export const dismissMiniPlayer = () => store.set(true);

/** 再出返（例如開始播嘢） */
export const restoreMiniPlayer = () => store.set(false);

export const useMiniPlayerDismissed = (): boolean => store.useValue();

/** App 層面掛一次（PlayerProvider 入面）：喺任何一頁開始播（isPlaying 由 false 變 true）就再出返 mini player */
export const useRestoreMiniPlayerOnPlay = () => useOnPlayStart(restoreMiniPlayer);
