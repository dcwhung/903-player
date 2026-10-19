import { ARC_START_DEGREES } from '../../config/constants';
import { arcDashArray, ratioToPoint } from '../../utils/arc';
import { CENTER, RADIUS, STROKE_WIDTH, THUMB_RADIUS } from './ArcSlider.constants';
import styles from './ArcSlider.module.css';

const ROTATE = `rotate(${ARC_START_DEGREES} ${CENTER} ${CENTER})`;

/** 弧形底槽 + 進度 + 圓點 */
export const ArcTrack = ({ ratio }: { ratio: number }) => {
    const thumb = ratioToPoint(ratio, CENTER, RADIUS);
    const circle = {
        cx: CENTER,
        cy: CENTER,
        r: RADIUS,
        strokeWidth: STROKE_WIDTH,
        transform: ROTATE,
    };
    return (
        <>
            <circle
                className={styles.track}
                {...circle}
                strokeDasharray={arcDashArray(1, RADIUS)}
            />
            <circle
                className={styles.progress}
                {...circle}
                strokeDasharray={arcDashArray(ratio, RADIUS)}
            />
            <circle className={styles.thumb} cx={thumb.x} cy={thumb.y} r={THUMB_RADIUS} />
        </>
    );
};
