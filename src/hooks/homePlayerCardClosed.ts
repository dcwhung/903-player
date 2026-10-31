import type { ShowTheme } from '../config/showThemes';
import { createValueStore } from './flagStore';
import { useOnPlayStart } from './useOnPlayStart';

/** 啱啱撳 ✕ 閂咗嘅節目 / 劇集：右邊把手照顯示佢（mini player 已經收埋，冇得再攞） */
export interface ClosedPlayerCard {
    theme: ShowTheme;
    showName: string;
}

/**
 * 闊橫版主頁右邊播放卡（HomePlayerCard）畀用戶撳 ✕ 閂咗：同 mini player 左滑關閉一樣停播、收埋，
 * 但留低把手（記住閂咗邊個）畀用戶開返。存喺 module，去節目頁再返主頁都記得；重開 app 就 reset
 */
const store = createValueStore<ClosedPlayerCard | null>(null);

/** 撳卡角 ✕：記低閂咗邊個，主頁格仔用返全闊，右邊出把手 */
export const closeHomePlayerCard = (card: ClosedPlayerCard) => store.set(card);

/** 撳右邊把手、或者開始播嘢：再出返張卡 */
export const openHomePlayerCard = () => store.set(null);

/** 閂咗就係嗰個節目 / 劇集，冇閂係 null */
export const useClosedHomePlayerCard = (): ClosedPlayerCard | null => store.useValue();

/** App 層面掛一次：喺任何一頁開始播（例如撳格仔嘅繼續收聽）就再出返張卡，同 mini player 一樣 */
export const useReopenHomePlayerCardOnPlay = () => useOnPlayStart(openHomePlayerCard);
