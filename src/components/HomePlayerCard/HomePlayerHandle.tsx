import type { ShowTheme } from '../../config/showThemes';
import { t } from '../../i18n/t';
import { TRANSITION_NAME } from '../../utils/viewTransition';
import { BackIcon } from '../icons/icons';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './HomePlayerCard.module.css';

const HANDLE_ICON_SIZE = 14;

interface HomePlayerHandleProps {
    theme: ShowTheme;
    showName: string;
    onOpen: () => void;
}

/** 播放卡收埋咗：右邊緣一條窄把手（節目色、細碟、直寫節目名、‹），撳就再出返張卡 */
export const HomePlayerHandle = ({ theme, showName, onOpen }: HomePlayerHandleProps) => (
    <ThemeScope theme={theme} fullPage={false} className={styles.handleScope}>
        <button
            type="button"
            className={styles.handle}
            aria-label={t('homeCard.reopen', { name: showName })}
            style={{ viewTransitionName: TRANSITION_NAME.handle }}
            onClick={onOpen}
        >
            {theme.art && <img className={styles.handleDisc} src={theme.art} alt="" />}
            <span className={styles.handleName}>{showName}</span>
            <BackIcon size={HANDLE_ICON_SIZE} />
        </button>
    </ThemeScope>
);
