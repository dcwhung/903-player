import { useNavigate } from 'react-router-dom';
import type { MiniPlayerProps } from '../../components/pages/home/MiniPlayer/MiniPlayer';
import { openHomePlayerCard, type ClosedPlayerCard } from '../../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import type { PlayerItem } from '../../types/playerItem';
import { zoomInto, zoomKey } from '../../utils/cardZoom';

/** 節目 / 劇集嘅播放頁（同 mini player 撳入去嗰頁一樣） */
const playerItemPath = (item: PlayerItem): string =>
    item.kind === 'drama' ? `/drama/${item.id}` : `/show/${item.id}`;

interface HomeHandleOpenInput {
    /** HomeView：撳把手入播放頁；否則（其他闊版）出返張卡 */
    opensPage: boolean;
    miniPlayer: MiniPlayerProps | null;
    closed: ClosedPlayerCard | null;
    /** 出返張卡（useHomeCardToggle open） */
    openCard: () => void;
}

/**
 * 主頁右邊把手撳咗做乜（HomeWide fillWithHandle）。其他闊版（Duo 打開・橫等）照舊出返張卡。
 * HomeView（P10 v2.0.2 用戶反饋）：直接入把手嗰個節目 / 劇集嘅播放頁，唔再出返張卡——
 * 有 mini player = 同 mini player / 卡角 ↗ 一樣（onOpen，節目帶埋嗰集 url），唔郁播放；
 * ✕ 閂咗（停咗播）= 放返 mini player（同闊版把手）再入記低嗰個節目 / 劇集頁，停喺暫停、唔自動播。
 * 過場同主頁格仔入頁一樣由把手個框 zoom 開（Z3，utils/cardZoom，把手帶 zoomKey）；減少動態 / 唔支援就直接轉頁。
 * 閂咗但唔知係邊個（舊資料）冇頁可以入，就跟闊版出返張卡
 */
export const useHomeHandleOpen = ({
    opensPage,
    miniPlayer,
    closed,
    openCard,
}: HomeHandleOpenInput): { onOpen: () => void; zoomKey: string | undefined } => {
    const navigate = useNavigate();
    // 同闊版把手一樣放返 mini player（停喺暫停）：player 仍然載入住嗰集，入頁就唔會自動播（useAudioBusy）
    const openClosed = (item: PlayerItem) => {
        restoreMiniPlayer();
        openHomePlayerCard();
        void navigate(playerItemPath(item));
    };
    if (!opensPage) return { onOpen: openCard, zoomKey: undefined };
    const onOpen = () => {
        const item = closed?.item;
        if (closed && !item) {
            openCard();
            return;
        }
        const go = item ? () => openClosed(item) : miniPlayer?.onOpen;
        if (go) zoomInto(zoomKey.homeHandle, go);
    };
    return { onOpen, zoomKey: zoomKey.homeHandle };
};
