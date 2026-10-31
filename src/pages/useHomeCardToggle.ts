import { useState } from 'react';
import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import { closeHomePlayerCard, openHomePlayerCard } from '../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../hooks/miniPlayerDismissed';
import { withViewTransition } from '../utils/viewTransition';

/**
 * 卡角 ✕ / 右邊把手：
 * ✕ = 同 mini player 左滑關閉一樣停播、收埋（onDismiss），記低閂咗邊個畀把手顯示，張卡縮入把手；
 * 把手 = 再出返張卡（mini player 唔再收埋），停喺暫停，唔會自動播。
 * 焦點跟住用戶動作去把手 / 張卡（自動因播放再出返唔郁焦點）
 */
export const useHomeCardToggle = (miniPlayer: MiniPlayerProps | null) => {
    const [focus, setFocus] = useState<'card' | 'handle' | null>(null);
    return {
        focus,
        close: () => {
            if (!miniPlayer) return;
            setFocus('handle');
            const { theme, showName, onDismiss } = miniPlayer;
            withViewTransition(() => {
                onDismiss();
                closeHomePlayerCard({ theme, showName });
            }, 'close');
        },
        open: () => {
            setFocus('card');
            withViewTransition(() => {
                restoreMiniPlayer();
                openHomePlayerCard();
            }, 'open');
        },
    };
};
