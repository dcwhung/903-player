import { t } from '../../i18n/t';
import styles from './MiniPlayer.module.css';
import { MiniPlayerDots } from './MiniPlayerDots';
import type { MiniPlayerMode } from './miniPlayerMode';
import { MiniPlayerProgress } from './MiniPlayerProgress';
import { MiniPlayerRow } from './MiniPlayerRow';
import type { MiniPlayerProps } from './miniPlayerTypes';

type MiniPlayerCardProps = Omit<MiniPlayerProps, 'region'> & {
    mode: MiniPlayerMode;
    /** 長按浮起咗：副題換做「滑動關閉」提示 */
    armed: boolean;
};

/** card 入面：節目列 + 指示點（多段先有）+ 進度 + 讀屏 / 鍵盤用嘅「關閉播放器」掣 */
export const MiniPlayerCard = ({
    labels,
    keys,
    index,
    tags = [],
    positionLabel,
    onChange,
    onDismiss,
    mode,
    armed,
    ...props
}: MiniPlayerCardProps) => (
    <>
        <MiniPlayerRow
            {...props}
            tag={tags[index]}
            hint={armed ? t('miniPlayer.dismissHint') : undefined}
        />
        {mode === 'multi' && (
            <MiniPlayerDots {...{ keys, labels, index, tags, positionLabel, onChange }} />
        )}
        <MiniPlayerProgress progress={props.progress} timeText={props.timeText} />
        <button type="button" className={styles.srOnly} onClick={onDismiss}>
            {t('miniPlayer.dismissLabel')}
        </button>
    </>
);
