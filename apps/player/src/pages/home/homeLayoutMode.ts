/**
 * 主頁版面：
 * stack = 直版 / 手機打橫（橫額、tab、格仔上下排，底部 mini player，同以前一樣）；
 * fill = 闊橫版冇 mini player（tab 喺頂，下面橫額入格填滿）；
 * split = 闊橫版有 mini player（左邊 tab + 填滿格，右邊播放卡，底部冇 mini player）；
 * fillWithHandle = 闊橫版但播放卡畀 ✕ 閂咗（停咗播、mini player 收埋；全闊填滿格 + 右邊把手開返），
 * 或者 HomeView 由內頁返主頁收埋咗張卡（照播，把手開返；hooks/homeReturn）
 */
export type HomeLayoutMode = 'stack' | 'fill' | 'split' | 'fillWithHandle';

interface HomeLayoutInput {
    /** 闊橫版（WIDE_BANNER_QUERY） */
    wide: boolean;
    hasMiniPlayer: boolean;
    /** 用戶撳 ✕ 閂咗播放卡（閂咗之後冇 mini player 都要留把手） */
    cardClosed: boolean;
    /** HomeView 由內頁返主頁：張卡收埋但唔停播（有 mini player 先有卡可以收）；預設冇收埋 */
    cardFolded?: boolean;
}

export const homeLayoutMode = ({
    wide,
    hasMiniPlayer,
    cardClosed,
    cardFolded = false,
}: HomeLayoutInput): HomeLayoutMode => {
    if (!wide) return 'stack';
    if (cardClosed) return 'fillWithHandle';
    if (!hasMiniPlayer) return 'fill';
    return cardFolded ? 'fillWithHandle' : 'split';
};
