import { t } from '../../i18n/t';
import { PLAYBACK_LINE_KEY, type PlaybackLineState } from '../../utils/playbackState';
import { Marquee } from '../Marquee/Marquee';
import styles from './NowPlaying.module.css';

interface NowPlayingProps {
    /** 「現正播放：」後面嘅字（例如 21/10（三）、好朋友手牽手 · 第 2 / 4 集） */
    label: string;
    /** 第二行淡色細字（例如廣播劇集名）；冇就得一行 */
    detail?: string | undefined;
    /** 未讀到時長（例如斷網）：第一行改為「連線中…」 */
    connecting: boolean;
    /** 字眼：預設「現正播放」；廣播劇頁暫停講「已暫停」、未開始講「下一集」、未載入叫用戶揀短篇 */
    status?: PlaybackLineState;
}

/**
 * 橫版唱片下面嘅「現正播放」（直版用日子條 / 短篇 chips 上面嘅標籤）。
 * 放唔落同直版一樣用 … 收尾，唔捲（只有清單播緊嗰行先跑馬燈）；高度固定（tokens.css --now-playing-*），唱片大細先計得準
 */
export const NowPlaying = ({ label, detail, connecting, status = 'playing' }: NowPlayingProps) => (
    <div className={styles.group}>
        <Marquee
            className={styles.line}
            animate={false}
            text={connecting ? t('episodes.connecting') : t(PLAYBACK_LINE_KEY[status], { label })}
        />
        {detail && <Marquee className={styles.detail} text={detail} animate={false} />}
    </div>
);
