import type { ShowTheme } from '../../config/showThemes';
import { Disc } from '../Disc/Disc';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './ShowCardStack.module.css';

/** 卡疊入面一個節目 */
export interface StackCard {
    /** React key（錄音 URL） */
    key: string;
    title: string;
    /** 節目色調（連節目圖），後面嘅卡用自己節目嘅色 */
    theme: ShowTheme;
}

/** depth1 / depth2：疊喺後面；incoming：上一個節目，喺左邊畫面外等住飛返入嚟 */
export type GhostSlot = 'depth1' | 'depth2' | 'incoming';

interface GhostCardProps {
    card: StackCard;
    slot: GhostSlot;
}

/**
 * 唔係最上面嗰張卡：只畫唱片同節目名，冇播放器邏輯、冇 <audio>、冇掣；
 * aria-hidden + inert，讀屏同 Tab 都唔會去到。
 */
export const GhostCard = ({ card, slot }: GhostCardProps) => (
    <div className={`${styles.card} ${styles[slot]}`} aria-hidden="true" inert>
        <ThemeScope theme={card.theme} fullPage={false} className={styles.face}>
            <div className={styles.gauge}>
                <div className={styles.discArea}>
                    <Disc art={card.theme.art} />
                </div>
            </div>
            <p className={styles.title}>{card.title}</p>
        </ThemeScope>
    </div>
);
