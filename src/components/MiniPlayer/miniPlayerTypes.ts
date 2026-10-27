import type { ShowTheme } from '../../config/showThemes';
import type { MiniPlayerTag } from '../../selectors/miniPlayer';

export interface MiniPlayerProps {
    showName: string;
    /** 成個播放器嘅讀屏名：今日節目 / 廣播劇 */
    region: string;
    /** 開頁掣嘅讀屏名：節目頁 / 廣播劇頁 */
    openLabel: string;
    theme: ShowTheme;
    subtitle: string;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
    isPlaying: boolean;
    /** 真正出緊聲（唔係載緊 / 斷流）：細碟先自轉，同大碟一樣 */
    isAudible: boolean;
    /** 未知時長：細碟擺正，同大碟一樣 */
    upright: boolean;
    /** 0–1 */
    progress: number;
    /** 今日所有節目名（按播出次序） */
    labels: string[];
    /** 同 labels 一樣次序嘅錄音 URL */
    keys: string[];
    index: number;
    /** 同 labels 一樣次序嘅標籤（重溫 / 今日）；冇就唔顯示 */
    tags?: readonly (MiniPlayerTag | undefined)[];
    /** 指示點成組嘅讀屏名；預設係「今日第幾個節目」 */
    positionLabel?: (index: number, total: number) => string;
    onToggle: () => void;
    onOpen: () => void;
    onChange: (index: number) => void;
    /** 長按後左滑關閉（或者讀屏「關閉播放器」掣）：停播 + 收起 */
    onDismiss: () => void;
}
