import type { ShowTheme } from '../../config/showThemes';
import { t } from '../../i18n/t';
import { BackIcon } from '../icons/icons';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './HomePlayerCard.module.css';

const HANDLE_ICON_SIZE = 14;

interface HomePlayerHandleProps {
    theme: ShowTheme;
    showName: string;
    onOpen: () => void;
    /** 用戶撳 ✕ 收埋：出現時焦點跟去把手（S-630） */
    focusOnMount?: boolean;
}

/** 播放卡閂咗：右邊緣一條窄把手（閂咗嗰個節目嘅色、細碟、直寫名、‹），撳就再出返張卡（暫停） */
export const HomePlayerHandle = ({
    theme,
    showName,
    onOpen,
    focusOnMount = false,
}: HomePlayerHandleProps) => (
    <ThemeScope theme={theme} fullPage={false} className={styles.handleScope}>
        <button
            type="button"
            className={styles.handle}
            aria-label={t('homeCard.reopen', { name: showName })}
            // 閂卡 / 開返過場期間先同張卡同名（global.css）：返主頁時成頁唔會縮入把手（S-642）
            data-home-handle=""
            onClick={onOpen}
            autoFocus={focusOnMount}
        >
            {theme.art && <img className={styles.handleDisc} src={theme.art} alt="" />}
            <span className={styles.handleName}>{showName}</span>
            <BackIcon size={HANDLE_ICON_SIZE} />
        </button>
    </ThemeScope>
);
