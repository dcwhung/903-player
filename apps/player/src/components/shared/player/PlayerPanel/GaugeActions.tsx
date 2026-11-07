import { t } from '../../../../i18n/t';
import type { Track } from '../../../../types/track';
import { PauseIcon, PlayIcon, RestartIcon } from '../../common/icons/icons';
import { BookmarkButton } from '../BookmarkButton/BookmarkButton';
import styles from './PlayerPanel.module.css';

const RESTART_ICON_SIZE = 22;
const TOGGLE_ICON_SIZE = 26;

interface GaugeActionsProps {
    isPlaying: boolean;
    /** 冇就唔出由頭播放掣（播放掣位置唔變） */
    onRestart?: () => void;
    onToggle: () => void;
    /** 顯示緊嘅一集：有就喺播放掣右邊出收藏掣（P7 #7 P2，同左邊由頭播放對稱） */
    bookmark?: Track | undefined;
    /** 未揀任何一集：播放掣同收藏掣變淡、撳唔郁（aria-disabled，Tab / 讀屏照行到） */
    disabled?: boolean;
}

const ignore = () => undefined;

/** 由頭播放 + 播放 / 暫停 + 收藏 */
export const GaugeActions = ({
    isPlaying,
    onRestart,
    onToggle,
    bookmark,
    disabled = false,
}: GaugeActionsProps) => (
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
            aria-disabled={disabled ? 'true' : undefined}
            onClick={disabled ? ignore : onToggle}
        >
            {isPlaying ? (
                <PauseIcon size={TOGGLE_ICON_SIZE} />
            ) : (
                <PlayIcon size={TOGGLE_ICON_SIZE} />
            )}
        </button>
        {bookmark && (
            <BookmarkButton
                track={bookmark}
                label={t('bookmark.toggleCurrent')}
                className={styles.bookmark}
                disabled={disabled}
            />
        )}
    </div>
);
