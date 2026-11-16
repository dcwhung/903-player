import type { ArcSummary } from '../../../../selectors/arcProgress';
import { PauseIcon, PlayIcon, RestartIcon } from '../../../shared/common/icons/icons';
import { playLabel } from './arcLabels';
import styles from './ArcSheet.module.css';

const PLAY_ICON_SIZE = 18;

/** 右邊掣個 icon：播緊 ❚❚；聽完 ↺ 重聽；其他 ▶ */
const PlayButtonIcon = ({
    summary,
    isCurrent,
    isPlaying,
}: {
    summary: ArcSummary;
    isCurrent: boolean;
    isPlaying: boolean;
}) => {
    if (isCurrent && isPlaying) return <PauseIcon size={PLAY_ICON_SIZE} />;
    if (!isCurrent && summary.state === 'done') return <RestartIcon size={PLAY_ICON_SIZE} />;
    return <PlayIcon size={PLAY_ICON_SIZE} />;
};

/** 右邊播放掣（續聽 / 未收聽 / 重聽；播緊嗰個就暫停） */
export const PlayButton = ({
    summary,
    isCurrent,
    isPlaying,
    onPlay,
}: {
    summary: ArcSummary;
    isCurrent: boolean;
    isPlaying: boolean;
    onPlay: (summary: ArcSummary) => void;
}) => (
    <button
        type="button"
        className={styles.play}
        aria-label={playLabel(summary, isCurrent, isPlaying)}
        onClick={() => onPlay(summary)}
    >
        <PlayButtonIcon summary={summary} isCurrent={isCurrent} isPlaying={isPlaying} />
    </button>
);
