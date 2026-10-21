import type { DOMAttributes, Ref } from 'react';
import styles from './Disc.module.css';

interface DiscProps {
    size?: 'large' | 'small';
    /** 節目圖；冇就顯示純色碟 */
    art?: string | undefined;
    /** 節目頁日子條拖動時轉節目圖（直接寫 style，唔經 render） */
    artRef?: Ref<HTMLImageElement> | undefined;
    /** 碟面（自轉 + 捽碟 / 拖弧形跟手指轉嘅手動角度） */
    faceRef?: Ref<HTMLSpanElement> | undefined;
    /** 真正出緊聲而且冇人捉住：自轉；停咗 / 載緊就停喺原位 */
    spinning?: boolean;
    /** 未知時長（斷網 / metadata 未到）：碟擺正，清走自轉停低嘅角度 */
    upright?: boolean;
    /** 捽碟 seek 嘅 pointer events；冇就係純裝飾 */
    scrub?: DOMAttributes<HTMLDivElement> | undefined;
}

const GROOVE_COUNT = 3;

/**
 * 唱片：底色係節目圖，large 用喺播放器，small 用喺列表同 mini player。
 * 三層轉動各自一層，唔會互相覆蓋：.disc 唔轉（陰影有向下偏移，轉咗會跟住轉）；
 * .face 自轉（CSS rotate）+ 手動角度（transform）；入面節目圖畀日子條轉
 */
export const Disc = ({
    size = 'large',
    art,
    artRef,
    faceRef,
    spinning = false,
    upright = false,
    scrub,
}: DiscProps) => (
    <div
        className={`${styles.disc} ${styles[size]} ${scrub ? styles.scrubbable : ''}`}
        aria-hidden="true"
        {...scrub}
    >
        <span
            ref={faceRef}
            className={`${styles.face} ${spinning ? styles.spinning : ''} ${upright ? styles.upright : ''}`}
        >
            {art && <img ref={artRef} className={styles.art} src={art} alt="" />}
        </span>
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
