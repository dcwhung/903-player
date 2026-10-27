import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { ShowTheme } from '../../config/showThemes';
import type { SwipeDirection } from '../../hooks/swipe';
import { stepIndex } from '../../hooks/useSwipe';
import { t } from '../../i18n/t';
import { useViewportGap } from '../../hooks/useViewportGap';
import type { MiniPlayerTag } from '../../selectors/miniPlayer';
import { PowerIcon } from '../icons/icons';
import { PageDots, type PageDotVariant } from '../PageDots/PageDots';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './MiniPlayer.module.css';
import { miniPlayerMode } from './miniPlayerMode';
import { MiniPlayerProgress } from './MiniPlayerProgress';
import { MiniPlayerRow } from './MiniPlayerRow';
import { useDismissGesture, type DismissView } from './useDismissGesture';

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

/**
 * 主頁底部播放器（今日節目，或者載入緊嘅廣播劇）：跟節目轉色，左右掃轉節目，撳入節目頁 / 廣播劇頁。
 * 用 portal 掛喺 body：頁面 .scope 係 size container（會變成 position: fixed 嘅 containing block），
 * 掛喺 body 先保證係跟 viewport 定位，唔受頁面 .scope / #root 影響
 */
/** 指示點跟標籤色：重溫 = 藍（未揀中淡啲），今日 = 揀中時奶油金；冇標籤就普通點 */
const DOT_VARIANTS: Record<MiniPlayerTag, PageDotVariant> = { rewatch: 'blue', today: 'gold' };
const dotVariant = (tag: MiniPlayerTag | undefined): PageDotVariant | undefined =>
    tag && DOT_VARIANTS[tag];

const POWER_ICON_SIZE = 18;

/** 左右掃轉節目：掃過頭會循環返另一頭；得一個節目就唔郁 */
const stepShow =
    (index: number, total: number, onChange: (index: number) => void) =>
    (direction: SwipeDirection) => {
        const next = stepIndex(index, total, direction, { wrap: true });
        if (next !== index) onChange(next);
    };

type DotsProps = Pick<
    MiniPlayerProps,
    'keys' | 'labels' | 'index' | 'tags' | 'positionLabel' | 'onChange'
>;

/** 頂部指示點（多過一段錄音先有）：撳 = 跳去嗰個節目 */
const MiniPlayerDots = ({ tags = [], onChange, ...dots }: DotsProps) => (
    <div className={styles.dots}>
        <PageDots {...dots} onSelect={onChange} variants={tags.map(dotVariant)} />
    </div>
);

/** 浮起 / 拉緊 / 露出關閉掣：CSS 用 data-* */
const dismissData = (view: DismissView) => ({
    'data-pressing': view.pressing || undefined,
    'data-armed': view.armed || undefined,
    'data-dragging': view.dragging || undefined,
    'data-revealed': view.revealed || undefined,
    'data-closing': view.closing || undefined,
    'data-lifted': (view.armed && !view.dragging && !view.revealed && !view.closing) || undefined,
});

/** card 向左移咗幾多：card 同後面「關閉」掣嘅闊度都跟呢個 CSS 變數 */
const offsetStyle = (view: DismissView) =>
    ({ '--mini-dismiss-offset': `${view.offset}px` }) as CSSProperties;

/**
 * card 後面嘅「⏻ 關閉」：左滑先露出，闊度跟 card 移咗幾多。
 * 淨係畀手指 / 滑鼠用（讀屏 / 鍵盤用 card 入面嘅「關閉播放器」掣），所以 aria-hidden + 唔入 tab 次序
 */
const DismissButton = ({ onDismiss }: { onDismiss: () => void }) => (
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

export const MiniPlayer = ({
    region,
    labels,
    keys,
    index,
    tags = [],
    positionLabel,
    onChange,
    onDismiss,
    ...props
}: MiniPlayerProps) => {
    useViewportGap();
    const { view, handlers, bindContainer, dismiss } = useDismissGesture(
        stepShow(index, labels.length, onChange),
        onDismiss,
    );

    // 得一段錄音：冇指示點，連個 wrapper 都唔畫，CSS 唔留指示點個位（data-mode）
    const mode = miniPlayerMode(keys);
    return createPortal(
        <ThemeScope theme={props.theme} fullPage={false} className={styles.wrapper}>
            <div ref={bindContainer} className={styles.slot} style={offsetStyle(view)}>
                <section
                    className={styles.player}
                    aria-label={region}
                    data-mode={mode}
                    {...dismissData(view)}
                    {...handlers}
                >
                    <MiniPlayerRow
                        {...props}
                        tag={tags[index]}
                        hint={view.armed ? t('miniPlayer.dismissHint') : undefined}
                    />
                    {mode === 'multi' && (
                        <MiniPlayerDots
                            {...{ keys, labels, index, tags, positionLabel, onChange }}
                        />
                    )}
                    <MiniPlayerProgress progress={props.progress} timeText={props.timeText} />
                    <button type="button" className={styles.srOnly} onClick={onDismiss}>
                        {t('miniPlayer.dismissLabel')}
                    </button>
                </section>
                <DismissButton onDismiss={dismiss} />
            </div>
        </ThemeScope>,
        document.body,
    );
};
