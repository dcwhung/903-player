import type { Ref } from 'react';
import styles from './Disc.module.css';

interface DiscProps {
    size?: 'large' | 'small';
    /** 節目圖；冇就顯示純色碟 */
    art?: string;
    /** 節目頁日子條拖動時轉節目圖（直接寫 style，唔經 render） */
    artRef?: Ref<HTMLImageElement>;
}

const GROOVE_COUNT = 3;

/** 唱片：底色係節目圖，large 用喺播放器，small 用喺列表同 mini player */
export const Disc = ({ size = 'large', art, artRef }: DiscProps) => (
    <div className={`${styles.disc} ${styles[size]}`} aria-hidden="true">
        {art && <img ref={artRef} className={styles.art} src={art} alt="" />}
        {size === 'large' && (
            <>
                <span className={styles.vignette} />
                {Array.from({ length: GROOVE_COUNT }, (_, index) => (
                    <span key={index} className={styles.groove} />
                ))}
            </>
        )}
        <span className={styles.spindle} />
    </div>
);
