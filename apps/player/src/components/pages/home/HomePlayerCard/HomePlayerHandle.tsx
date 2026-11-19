import type { ShowTheme } from '@903-player/catalog';
import { t } from '../../../../i18n/t';
import type { HandleStatus } from '../../../../selectors/pageHandle';
import { PlayerHandle } from '../../../shared/player/PlayerHandle/PlayerHandle';

interface HomePlayerHandleProps {
    theme: ShowTheme;
    showName: string;
    onOpen: () => void;
    /** 撳 ✕ 閂咗 = 已停（預設 paused）；HomeView 返主頁收埋嘅卡照播，跟播放狀態 */
    status?: HandleStatus;
    /** 用戶撳 ✕ 收埋：出現時焦點跟去把手（S-630） */
    focusOnMount?: boolean;
}

const REOPEN_LABEL = {
    paused: 'homeCard.reopen',
    playing: 'homeCard.reopenPlaying',
} as const satisfies Record<HandleStatus, string>;

/**
 * 播放卡閂咗 / 收埋：右邊緣把手（嗰個節目嘅色、「已暫停」/「播放中」），撳就再出返張卡。
 * 閂卡 / 開返過場期間先同張卡同名（data-home-handle，global.css）：返主頁時成頁唔會縮入把手（S-642）
 */
export const HomePlayerHandle = ({
    theme,
    showName,
    onOpen,
    status = 'paused',
    focusOnMount = false,
}: HomePlayerHandleProps) => (
    <PlayerHandle
        variant="home"
        theme={theme}
        name={showName}
        status={status}
        label={t(REOPEN_LABEL[status], { name: showName })}
        onActivate={onOpen}
        focusOnMount={focusOnMount}
    />
);
