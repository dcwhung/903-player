import type { ShowTheme } from '@903-player/catalog';
import { t } from '../../../../i18n/t';
import type { MiniPlayerTag } from '../../../../selectors/miniPlayer';
import { Disc } from '../../../shared/common/Disc/Disc';
import { PauseIcon, PlayIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { SleepTimerEntry } from '../../../shared/player/SleepTimer/SleepTimerEntry';
import styles from './MiniPlayer.module.css';
import { MiniPlayerProgress } from './MiniPlayerProgress';

interface MiniPlayerRowProps {
    showName: string;
    /** 左邊開頁掣嘅讀屏名：節目頁 / 廣播劇頁 */
    openLabel: string;
    theme: ShowTheme;
    subtitle: string;
    /** 節目名旁邊嘅細標籤（重溫 / 今日）；冇就唔顯示 */
    tag?: MiniPlayerTag;
    /** 長按浮起後代替副題嘅提示（‹‹ 滑動關閉）；冇就顯示副題 */
    hint?: string;
    isPlaying: boolean;
    isAudible: boolean;
    /** 0–1：播放掣外圈 */
    progress: number;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
    upright: boolean;
    onToggle: () => void;
    onOpen: () => void;
}

const TOGGLE_ICON_SIZE = 20;

/**
 * 節目名 + 細標籤：名放唔落就跑馬燈，標籤唔縮、貼住名右邊。
 * 開頁掣有 aria-label（已經講埋重溫），標籤只係睇嘅，讀屏唔使再讀
 */
const MiniPlayerName = ({ name, tag }: { name: string; tag?: MiniPlayerTag }) => (
    <span className={styles.nameLine}>
        <Marquee className={styles.name} text={name} />
        {tag && (
            <span className={styles.tag} data-tag={tag} aria-hidden="true">
                {t(`miniPlayer.tag.${tag}`)}
            </span>
        )}
    </span>
);

/**
 * 節目碟 + 名 + 副題（撳入節目頁 / 廣播劇頁；放唔落就跑馬燈），右邊係（睡眠 timer 月亮 +）播放 / 暫停
 *（外圈 = 播放進度）
 */
export const MiniPlayerRow = (props: MiniPlayerRowProps) => (
    <div className={styles.row}>
        <button
            type="button"
            className={styles.open}
            aria-label={props.openLabel}
            onClick={props.onOpen}
        >
            {/* 同大碟一樣：真正出緊聲先自轉（載緊 / 斷流 / 暫停就停喺原位），未知時長擺正 */}
            <Disc
                size="small"
                art={props.theme.art}
                spinning={props.isAudible}
                upright={props.upright}
            />
            <span className={styles.text}>
                <MiniPlayerName name={props.showName} tag={props.tag} />
                <Marquee className={styles.subtitle} text={props.hint ?? props.subtitle} />
            </span>
        </button>
        {/* 睡眠 timer（9d）：夜間 / 開緊先出，播放掣左邊；名同副題縮窄讓位（跑馬燈） */}
        <SleepTimerEntry placement="mini" />
        <MiniPlayerProgress progress={props.progress} timeText={props.timeText}>
            <button
                type="button"
                className={styles.toggle}
                aria-label={t(props.isPlaying ? 'player.pause' : 'player.play')}
                onClick={props.onToggle}
            >
                {props.isPlaying ? (
                    <PauseIcon size={TOGGLE_ICON_SIZE} />
                ) : (
                    <PlayIcon size={TOGGLE_ICON_SIZE} />
                )}
            </button>
        </MiniPlayerProgress>
    </div>
);
