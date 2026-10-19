import type { ShowTheme } from '../../config/showThemes';
import { t } from '../../i18n/t';
import { Disc } from '../Disc/Disc';
import { PauseIcon, PlayIcon } from '../icons/icons';
import styles from './MiniPlayer.module.css';

interface MiniPlayerRowProps {
    showName: string;
    theme: ShowTheme;
    subtitle: string;
    isPlaying: boolean;
    onToggle: () => void;
    onOpen: () => void;
}

const TOGGLE_ICON_SIZE = 20;

/** 節目碟 + 名 + 副題（撳入節目頁），右邊係播放 / 暫停 */
export const MiniPlayerRow = (props: MiniPlayerRowProps) => (
    <div className={styles.row}>
        <button
            type="button"
            className={styles.open}
            aria-label={t('miniPlayer.open', { name: props.showName })}
            onClick={props.onOpen}
        >
            <Disc size="small" art={props.theme.art} />
            <span className={styles.text}>
                <span className={styles.name}>{props.showName}</span>
                <span className={styles.subtitle}>{props.subtitle}</span>
            </span>
        </button>
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
    </div>
);
