import type { ShowTheme } from '../../../../config/showThemes';
import { t } from '../../../../i18n/t';
import type { Track } from '../../../../types/track';
import type { PlaybackLineState } from '../../../../utils/playbackState';
import { TRANSITION_NAME } from '../../../../utils/viewTransition';
import { PowerIcon } from '../../../shared/common/icons/icons';
import { NowPlaying } from '../../../shared/player/NowPlaying/NowPlaying';
import { PlayerGauge, type StandbyTime } from '../../../shared/player/PlayerPanel/PlayerGauge';
import { ThemeScope } from '../../../shared/common/ThemeScope/ThemeScope';
import { CardDots, CardHeader, type CardSwitchProps } from './CardHeader';
import { CardEpisodes, type HomeCardEpisodes } from './CardEpisodes';
import styles from './HomePlayerCard.module.css';
import { useCardSwipe } from './useCardSwipe';

export type { HomeCardEpisodes } from './CardEpisodes';

const CLOSE_ICON_SIZE = 16;

export interface HomeCardGaugeView {
    onStart: (() => void) | undefined;
    standbyTime: StandbyTime | undefined;
    label: string;
    /** 讀屏版（S-735）；冇就讀畫面字 */
    spokenLabel?: string | undefined;
    status: PlaybackLineState;
    connecting: boolean;
    /** 顯示緊嘅一集（收藏掣用）；搵唔到就冇收藏掣 */
    track?: Track | undefined;
}

/** 唱片格 + 「現正播放」：喺卡中間剩低嘅位置中 */
const CardGauge = ({ art, gauge }: { art: string | undefined; gauge: HomeCardGaugeView }) => (
    <div className={styles.player}>
        <PlayerGauge
            art={art}
            onStart={gauge.onStart}
            standbyTime={gauge.standbyTime}
            transitionName={TRANSITION_NAME.gauge}
            bookmark={gauge.track}
        />
        <NowPlaying
            label={gauge.label}
            spokenLabel={gauge.spokenLabel}
            status={gauge.status}
            connecting={gauge.connecting}
        />
    </div>
);

interface HomePlayerCardProps extends CardSwitchProps {
    region: string;
    showName: string;
    openLabel: string;
    theme: ShowTheme;
    gauge: HomeCardGaugeView;
    /** 集數清單（同內頁一樣），任何高度都有 */
    episodes: HomeCardEpisodes;
    onExpand: () => void;
    /** 卡角閂掣（同 mini player 關閉一樣 ⏻）：停播，張卡縮入右邊把手 */
    onClose: () => void;
    /** 用戶撳把手再出返：出現時焦點去頁頭列 */
    focusOnMount?: boolean;
}

/**
 * 闊橫版主頁右邊播放卡（代替底部 mini player）：節目色泥膠卡，入面係內頁播放器縮細
 * （頁頭列、唱片 + 弧形進度 + 播放掣、現正播放、集數清單）。✕ 半浮喺卡右上角。
 * 今日多個節目：同 mini player 一樣左右掃 / 撳指示點轉節目（W-516）
 */
export const HomePlayerCard = ({ theme, gauge, episodes, ...props }: HomePlayerCardProps) => {
    const swipe = useCardSwipe(props.index, props.keys.length, props.onChange);
    return (
        <ThemeScope theme={theme} fullPage={false} className={styles.scope}>
            <section
                data-home-card=""
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
                <CardEpisodes {...episodes} />
            </section>
            <button
                type="button"
                className={styles.close}
                aria-label={t('miniPlayer.dismissLabel')}
                onClick={props.onClose}
            >
                <PowerIcon size={CLOSE_ICON_SIZE} />
            </button>
        </ThemeScope>
    );
};
