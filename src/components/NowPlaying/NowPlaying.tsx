import { t } from '../../i18n/t';
import { Marquee } from '../Marquee/Marquee';
import styles from './NowPlaying.module.css';

interface NowPlayingProps {
    /** 「現正播放：」後面嘅字（例如 21/10（三）、好朋友手牽手 · 第 2 / 4 集） */
    label: string;
    /** 第二行淡色細字（例如廣播劇集名）；冇就得一行 */
    detail?: string | undefined;
    /** 未讀到時長（例如斷網）：第一行改為「連線中…」 */
    connecting: boolean;
}

/**
 * 橫版唱片下面嘅「現正播放」（直版用日子條 / 短篇 chips 上面嘅標籤）。
 * 放唔落就跑馬燈（Marquee）；高度固定（tokens.css --now-playing-*），唱片大細先計得準
 */
export const NowPlaying = ({ label, detail, connecting }: NowPlayingProps) => (
    <div className={styles.group}>
        <Marquee
            className={styles.line}
            text={connecting ? t('episodes.connecting') : t('episodes.nowPlayingLine', { label })}
        />
        {detail && <Marquee className={styles.detail} text={detail} />}
    </div>
);
