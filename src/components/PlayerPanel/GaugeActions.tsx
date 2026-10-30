import { t } from '../../i18n/t';
import { PauseIcon, PlayIcon, RestartIcon } from '../icons/icons';
import styles from './PlayerPanel.module.css';

const RESTART_ICON_SIZE = 22;
const TOGGLE_ICON_SIZE = 26;

interface GaugeActionsProps {
    isPlaying: boolean;
    /** 冇就唔出由頭播放掣（播放掣位置唔變） */
    onRestart?: () => void;
    onToggle: () => void;
}

/** 由頭播放 + 播放 / 暫停兩粒掣 */
export const GaugeActions = ({ isPlaying, onRestart, onToggle }: GaugeActionsProps) => (
    <div className={styles.actions}>
        {onRestart && (
            <button
                type="button"
                className={styles.restart}
                aria-label={t('player.restart')}
                onClick={onRestart}
            >
                <RestartIcon size={RESTART_ICON_SIZE} />
            </button>
        )}
        <button
            type="button"
            className={styles.toggle}
            aria-label={t(isPlaying ? 'player.pause' : 'player.play')}
            onClick={onToggle}
        >
            {isPlaying ? (
                <PauseIcon size={TOGGLE_ICON_SIZE} />
            ) : (
                <PlayIcon size={TOGGLE_ICON_SIZE} />
            )}
        </button>
    </div>
);
