import { SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '../../config/constants';
import { t } from '../../i18n/t';
import { PauseIcon, PlayIcon } from '../icons/icons';
import styles from './PlayerControls.module.css';

interface PlayerControlsProps {
    isPlaying: boolean;
    onToggle: () => void;
    onSkip: (deltaSeconds: number) => void;
}

const TOGGLE_ICON_SIZE = 32;

interface SkipButtonProps {
    seconds: number;
    direction: 'back' | 'forward';
    onSkip: (deltaSeconds: number) => void;
}

const SkipButton = ({ seconds, direction, onSkip }: SkipButtonProps) => {
    const isBack = direction === 'back';
    return (
        <button
            type="button"
            className={styles.skip}
            aria-label={t(isBack ? 'player.seekBack' : 'player.seekForward', { seconds })}
            onClick={() => onSkip(isBack ? -seconds : seconds)}
        >
            {t(isBack ? 'player.seekBackShort' : 'player.seekForwardShort', { seconds })}
        </button>
    );
};

export const PlayerControls = ({ isPlaying, onToggle, onSkip }: PlayerControlsProps) => (
    <div className={styles.controls}>
        {SKIP_BACK_SECONDS.map((seconds) => (
            <SkipButton
                key={`back-${seconds}`}
                seconds={seconds}
                direction="back"
                onSkip={onSkip}
            />
        ))}
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
        {SKIP_FORWARD_SECONDS.map((seconds) => (
            <SkipButton
                key={`fwd-${seconds}`}
                seconds={seconds}
                direction="forward"
                onSkip={onSkip}
            />
        ))}
    </div>
);
