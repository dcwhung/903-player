import type { ShowTheme } from '../../config/showThemes';
import { t } from '../../i18n/t';
import type { PlaybackLineState } from '../../utils/playbackState';
import { TRANSITION_NAME } from '../../utils/viewTransition';
import { CloseIcon } from '../icons/icons';
import { NowPlaying } from '../NowPlaying/NowPlaying';
import { PlayerGauge, type StandbyTime } from '../PlayerPanel/PlayerGauge';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import { CardDots, CardHeader, type CardSwitchProps } from './CardHeader';
import { CardNext, type HomeCardNext } from './CardNext';
import styles from './HomePlayerCard.module.css';
import { useCardSwipe } from './useCardSwipe';

export type { HomeCardNext } from './CardNext';

const CLOSE_ICON_SIZE = 16;

export interface HomeCardGaugeView {
    onStart: (() => void) | undefined;
    standbyTime: StandbyTime | undefined;
    label: string;
    status: PlaybackLineState;
    connecting: boolean;
}

/** 唱片格 + 「現正播放」：喺卡中間剩低嘅位置中 */
const CardGauge = ({ art, gauge }: { art: string | undefined; gauge: HomeCardGaugeView }) => (
    <div className={styles.player}>
        <PlayerGauge
            art={art}
            onStart={gauge.onStart}
            standbyTime={gauge.standbyTime}
            transitionName={TRANSITION_NAME.gauge}
        />
        <NowPlaying label={gauge.label} status={gauge.status} connecting={gauge.connecting} />
    </div>
);

interface HomePlayerCardProps extends CardSwitchProps {
    region: string;
    showName: string;
    openLabel: string;
    theme: ShowTheme;
    gauge: HomeCardGaugeView;
    /** 高畫面先有「下一集」 */
    next?: HomeCardNext | undefined;
    onExpand: () => void;
    /** 卡角 ✕：淨係收埋張卡，照播 */
    onClose: () => void;
    /** 用戶撳把手再出返：出現時焦點去頁頭列 */
    focusOnMount?: boolean;
}

/**
 * 闊橫版主頁右邊播放卡（代替底部 mini player）：節目色泥膠卡，入面係內頁播放器縮細
 * （頁頭列、唱片 + 弧形進度 + 播放掣、現正播放；高畫面多「下一集」）。✕ 半浮喺卡右上角。
 * 今日多個節目：同 mini player 一樣左右掃 / 撳指示點轉節目（W-516）
 */
export const HomePlayerCard = ({ theme, gauge, next, ...props }: HomePlayerCardProps) => {
    const swipe = useCardSwipe(props.index, props.keys.length, props.onChange);
    return (
        <ThemeScope theme={theme} fullPage={false} className={styles.scope}>
            <section
                className={styles.card}
                aria-label={props.region}
                style={{ viewTransitionName: TRANSITION_NAME.panel }}
                {...swipe}
            >
                <CardHeader
                    name={props.showName}
                    art={theme.art}
                    openLabel={props.openLabel}
                    onExpand={props.onExpand}
                    focusOnMount={props.focusOnMount ?? false}
                    tag={props.tags?.[props.index]}
                />
                <CardDots {...props} />
                <CardGauge art={theme.art} gauge={gauge} />
                {next && <CardNext {...next} />}
            </section>
            <button
                type="button"
                className={styles.close}
                aria-label={t('homeCard.close')}
                onClick={props.onClose}
            >
                <CloseIcon size={CLOSE_ICON_SIZE} />
            </button>
        </ThemeScope>
    );
};
