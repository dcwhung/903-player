import type { ShowTheme } from '@903-player/catalog';
import { t } from '../../../../i18n/t';
import { PlayerHandle } from '../../../shared/player/PlayerHandle/PlayerHandle';

interface HomePlayerHandleProps {
    theme: ShowTheme;
    showName: string;
    onOpen: () => void;
    /** 用戶撳 ✕ 收埋：出現時焦點跟去把手（S-630） */
    focusOnMount?: boolean;
}

/**
 * 播放卡閂咗：右邊緣把手（閂咗嗰個節目嘅色、「已暫停」），撳就再出返張卡（暫停）。
 * 閂卡 / 開返過場期間先同張卡同名（data-home-handle，global.css）：返主頁時成頁唔會縮入把手（S-642）
 */
export const HomePlayerHandle = ({
    theme,
    showName,
    onOpen,
    focusOnMount = false,
}: HomePlayerHandleProps) => (
    <PlayerHandle
        variant="home"
        theme={theme}
        name={showName}
        status="paused"
        label={t('homeCard.reopen', { name: showName })}
        onActivate={onOpen}
        focusOnMount={focusOnMount}
    />
);
