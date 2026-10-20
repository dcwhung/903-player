import { useRef, useState } from 'react';
import { usePlayer } from '../../player/usePlayer';
import { arcFollowDegrees } from '../../utils/discScrub';
import { useDiscScrub } from './useDiscScrub';
import { useDiscTurn } from './useDiscTurn';

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
    const onArcPreview = (seconds: number | null) => {
        if (seconds === null) {
            arcStart.current = null;
            motion.settle();
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
 * 唱片格嘅手勢：弧形 seek、捽碟 seek，兩者共用預覽（時間 / 弧形一齊郁）同碟面角度；
 * held = 外面（日子條）捉住碟。有人捉住碟（包括手指撳住碟面）或者暫停就唔自轉，停喺原位
 */
export const useGaugeGestures = (held: boolean) => {
    const player = usePlayer();
    const [preview, setPreview] = useState<Preview | null>(null);
    // 手指撳住碟（由 pointerdown 起，未轉夠門檻都算）：弧形即刻鎖住，碟即刻停轉
    const [discHeld, setDiscHeld] = useState(false);
    const { motion, onArcPreview } = useArcFollow(player.duration, setPreview);
    const disc = useDiscScrub({
        max: player.duration,
        currentTime: player.currentTime,
        locked: preview?.source === 'arc',
        onSeek: player.seek,
        onPreview: (seconds) => setPreview(seconds === null ? null : { source: 'disc', seconds }),
        onHold: setDiscHeld,
        motion,
    });
    return {
        player,
        shownTime: preview?.seconds ?? player.currentTime,
        arc: {
            // 捽碟時弧形跟住預覽；拖弧形時弧形自己有拖動值
            value: preview?.source === 'disc' ? preview.seconds : player.currentTime,
            locked: discHeld,
            onPreview: onArcPreview,
        },
        disc: {
            faceRef: motion.faceRef,
            spinning: player.isPlaying && !preview && !held && !discHeld,
            scrub: disc,
        },
    };
};
