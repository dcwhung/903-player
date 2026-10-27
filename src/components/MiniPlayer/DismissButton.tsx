import { t } from '../../i18n/t';
import { PowerIcon } from '../icons/icons';
import styles from './MiniPlayer.module.css';

const POWER_ICON_SIZE = 18;

/**
 * card 後面嘅「⏻ 關閉」：左滑先露出，闊度跟 card 移咗幾多。
 * 淨係畀手指 / 滑鼠用（讀屏 / 鍵盤用 card 入面嘅「關閉播放器」掣），所以 aria-hidden + 唔入 tab 次序
 */
export const DismissButton = ({ onDismiss }: { onDismiss: () => void }) => (
    <div className={styles.behind} aria-hidden="true">
        <button
            type="button"
            tabIndex={-1}
            className={styles.dismiss}
            data-testid="mini-player-close"
            onClick={onDismiss}
        >
            <PowerIcon size={POWER_ICON_SIZE} />
            <span>{t('miniPlayer.dismissAction')}</span>
        </button>
    </div>
);
