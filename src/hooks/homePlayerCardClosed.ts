import { createFlagStore } from './flagStore';
import { useOnPlayStart } from './useOnPlayStart';

/**
 * 闊橫版主頁右邊播放卡（HomePlayerCard）畀用戶撳 ✕ 收埋咗未：淨係收埋張卡，照播（唔同 mini player 左滑關閉）。
 * 存喺 module，去節目頁再返主頁都記得；重開 app 就 reset
 */
const store = createFlagStore();

/** 撳卡角 ✕：收埋張卡，主頁格仔用返全闊，右邊出把手 */
export const closeHomePlayerCard = () => store.set(true);

/** 撳右邊把手、或者開始播嘢：再出返張卡 */
export const openHomePlayerCard = () => store.set(false);

export const useHomePlayerCardClosed = (): boolean => store.useValue();

/** App 層面掛一次：喺任何一頁開始播（例如撳格仔嘅繼續收聽）就再出返張卡，同 mini player 一樣 */
export const useReopenHomePlayerCardOnPlay = () => useOnPlayStart(openHomePlayerCard);
