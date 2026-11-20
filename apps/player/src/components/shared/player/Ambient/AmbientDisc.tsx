import { Disc } from '../../common/Disc/Disc';
import styles from './Ambient.module.css';
import {
    CENTER,
    CIRCUMFERENCE,
    DASH_DECIMALS,
    RADIUS,
    RING_WIDTH,
    START_AT_TOP,
    VIEW_BOX_SIZE,
} from './ambientRing';

interface AmbientDiscProps {
    art: string;
    /** 0–1；null（直播 / 未知長度）就唔出圈 */
    progress: number | null;
    /** 真正出緊聲先轉 */
    spinning: boolean;
    /** 直播：碟擺正 */
    upright: boolean;
}

/** 進度圈：軌道淡色、進度由 12 點順時針（同 MiniPlayerProgress 做法）；純睇，讀屏讀右邊文字 */
const ProgressRing = ({ progress }: { progress: number }) => {
    const dash = (CIRCUMFERENCE * progress).toFixed(DASH_DECIMALS);
    return (
        <svg
            className={styles.ring}
            data-testid="ambient-ring"
            viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
            aria-hidden="true"
            focusable="false"
        >
            <circle
                className={styles.ringTrack}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                strokeWidth={RING_WIDTH}
            />
            <circle
                className={styles.ringFill}
                data-ring-fill=""
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                strokeWidth={RING_WIDTH}
                // mockup 圓頭；0% 用 butt，唔會出一點
                strokeLinecap={progress > 0 ? 'round' : 'butt'}
                strokeDasharray={`${dash} ${CIRCUMFERENCE.toFixed(DASH_DECIMALS)}`}
                transform={START_AT_TOP}
            />
        </svg>
    );
};

/** 閒置畫面左邊：唱片（重用 Disc large）+ 外圈播放進度 */
export const AmbientDisc = ({ art, progress, spinning, upright }: AmbientDiscProps) => (
    <div className={styles.discBox}>
        {progress !== null && <ProgressRing progress={progress} />}
        <Disc art={art} spinning={spinning} upright={upright} />
    </div>
);
