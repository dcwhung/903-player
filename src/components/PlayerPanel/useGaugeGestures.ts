import { useEffect, useRef, useState } from 'react';
import type { PlayerContextValue } from '../../player/playerContext';
import { usePlayer } from '../../player/usePlayer';
import { arcFollowDegrees } from '../../utils/discScrub';
import { hasKnownDuration } from '../../utils/time';
import { useDiscScrub } from './useDiscScrub';
import { useDiscTurn, type DiscTurn } from './useDiscTurn';

/** 邊個手勢喺度預覽緊（同一時間只可以有一個，另一個 locked） */
type PreviewSource = 'arc' | 'disc';

interface Preview {
    source: PreviewSource;
    seconds: number;
}

/** 拖弧形：碟由起手嗰下開始跟手指轉，唔會一撳就跳去撳中嘅位置 */
const useArcFollow = (max: number, setPreview: (preview: Preview | null) => void) => {
    const motion = useDiscTurn();
    const arcStart = useRef<number | null>(null);
    const onArcPreview = (seconds: number | null, cancelled: boolean) => {
        if (seconds === null) {
            arcStart.current = null;
            // 放手停喺原位；取消就轉返去起手角度（同捽碟一樣）
            if (cancelled) motion.revert();
            else motion.settle();
            setPreview(null);
            return;
        }
        arcStart.current ??= seconds;
        motion.turn(arcFollowDegrees(seconds - arcStart.current, max));
        setPreview({ source: 'arc', seconds });
    };
    return { motion, onArcPreview };
};

/**
 * 捽碟：拖緊弧形（arcActive）就唔開始；held = 手指撳住碟
 * （由 pointerdown 起，未轉夠門檻都算），外面即刻鎖住弧形、停自轉
 */
const useDiscGesture = (
    player: PlayerContextValue,
    arcActive: boolean,
    setPreview: (preview: Preview | null) => void,
    motion: DiscTurn,
) => {
    const [held, setHeld] = useState(false);
    const scrub = useDiscScrub({
        max: player.duration,
        currentTime: player.currentTime,
        locked: arcActive,
        onSeek: player.seek,
        onPreview: (seconds) => setPreview(seconds === null ? null : { source: 'disc', seconds }),
        onHold: setHeld,
        motion,
    });
    return { held, scrub };
};

/** 未知時長（斷網 / metadata 未到）：碟轉返正，等讀到時長先可以捽同自轉 */
const useUprightUntilKnown = (known: boolean, motion: DiscTurn) => {
    useEffect(() => {
        if (!known) motion.reset();
    }, [known, motion]);
};

/**
 * 唱片格嘅手勢：弧形 seek、捽碟 seek，兩者共用預覽（時間 / 弧形一齊郁）同碟面角度；
 * held = 外面（日子條）捉住碟。有人捉住碟（包括手指撳住碟面）、暫停或者未出聲（載緊 / 緩衝緊）就唔自轉，停喺原位
 */
export const useGaugeGestures = (held: boolean) => {
    const player = usePlayer();
    const [preview, setPreview] = useState<Preview | null>(null);
    const { motion, onArcPreview } = useArcFollow(player.duration, setPreview);
    const disc = useDiscGesture(player, preview?.source === 'arc', setPreview, motion);
    const known = hasKnownDuration(player.duration);
    useUprightUntilKnown(known, motion);
    return {
        player,
        known,
        shownTime: preview?.seconds ?? player.currentTime,
        arc: {
            // 捽碟時弧形跟住預覽；拖弧形時弧形自己有拖動值
            value: preview?.source === 'disc' ? preview.seconds : player.currentTime,
            locked: disc.held,
            onPreview: onArcPreview,
        },
        disc: {
            faceRef: motion.faceRef,
            spinning: player.isAudible && !preview && !held && !disc.held,
            upright: !known,
            scrub: known ? disc.scrub : undefined,
        },
    };
};
