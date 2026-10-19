import styles from './Disc.module.css';

interface DiscProps {
    size?: 'large' | 'small';
}

const GROOVE_COUNT = 3;

/** 唱片裝飾圖：large 用喺播放器，small 用喺節目掣同列表 */
export const Disc = ({ size = 'large' }: DiscProps) => (
    <div className={`${styles.disc} ${styles[size]}`} aria-hidden="true">
        {size === 'large' &&
            Array.from({ length: GROOVE_COUNT }, (_, index) => (
                <span key={index} className={styles.groove} />
            ))}
        <span className={styles.label}>
            <span className={styles.hole} />
        </span>
    </div>
);
