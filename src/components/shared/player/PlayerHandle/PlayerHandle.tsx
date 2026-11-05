import { useRef, type AnimationEvent } from 'react';
import type { ShowTheme } from '../../../../config/showThemes';
import { t } from '../../../../i18n/t';
import type { HandleStatus } from '../../../../selectors/pageHandle';
import { BackIcon } from '../../common/icons/icons';
import { ThemeScope } from '../../common/ThemeScope/ThemeScope';
import styles from './PlayerHandle.module.css';
import { useLeaveFallback } from './useLeaveFallback';

const HANDLE_ICON_SIZE = 14;

const STATUS_TEXT = {
    playing: 'common.status.playing',
    paused: 'common.status.paused',
} as const satisfies Record<HandleStatus, string>;

export interface PlayerHandleProps {
    theme: ShowTheme;
    name: string;
    status: HandleStatus;
    /** 讀屏名：狀態 + 名 + 撳咗會點（細字狀態 aria-hidden） */
    label: string;
    onActivate: () => void;
    /**
     * home = 主頁閂咗卡（data-home-handle，閂卡 / 開返過場同張卡同名）；
     * page = 內頁（data-page-handle，返主頁過場同張卡同名，見 global.css）
     */
    variant: 'home' | 'page';
    focusOnMount?: boolean;
    /** 淡出緊：淡完（animationend；cancel 咗或者冇動畫就靠 useLeaveFallback）叫 onLeft 先拆走 */
    leaving?: boolean;
    onLeft?: () => void;
}

/** 右邊緣一條窄把手：而家嘅嘢嘅色、細字狀態、細碟、直寫名、‹ */
export const PlayerHandle = ({ theme, status, leaving = false, ...props }: PlayerHandleProps) => {
    const ref = useRef<HTMLButtonElement>(null);
    useLeaveFallback(ref, leaving, props.onLeft);
    // 只認把手自己嘅淡出動畫，唔好俾入面元素嘅動畫觸發
    const onAnimationEnd = (event: AnimationEvent) => {
        if (leaving && event.target === event.currentTarget) props.onLeft?.();
    };
    return (
        <ThemeScope theme={theme} fullPage={false} className={styles.handleScope}>
            <button
                ref={ref}
                type="button"
                className={styles.handle}
                aria-label={props.label}
                {...{ [`data-${props.variant}-handle`]: '' }}
                data-leaving={leaving ? '' : undefined}
                // 淡出緊 = 播緊嘅已經係呢頁自己嘅嘢：唔再 focus / 撳得到，讀屏都唔再讀舊名（S-667）。
                // inert 已經擋咗撳，onClick 再擋一次畀未支援 inert 嘅瀏覽器
                inert={leaving}
                aria-hidden={leaving || undefined}
                onClick={leaving ? undefined : props.onActivate}
                onAnimationEnd={onAnimationEnd}
                autoFocus={props.focusOnMount ?? false}
            >
                <span className={styles.handleStatus} data-status={status} aria-hidden="true">
                    {t(STATUS_TEXT[status])}
                </span>
                {theme.art && <img className={styles.handleDisc} src={theme.art} alt="" />}
                <span className={styles.handleName}>{props.name}</span>
                <BackIcon size={HANDLE_ICON_SIZE} />
            </button>
        </ThemeScope>
    );
};
