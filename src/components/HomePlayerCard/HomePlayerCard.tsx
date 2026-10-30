import type { ShowTheme } from '../../config/showThemes';
import { t } from '../../i18n/t';
import type { PlaybackLineState } from '../../utils/playbackState';
import { TRANSITION_NAME } from '../../utils/viewTransition';
import { Disc } from '../Disc/Disc';
import { EpisodeList, type EpisodeItem, type EpisodeLabels } from '../EpisodeList/EpisodeList';
import { BackIcon, CloseIcon, ExpandIcon } from '../icons/icons';
import { NowPlaying } from '../NowPlaying/NowPlaying';
import { PlayerGauge, type StandbyTime } from '../PlayerPanel/PlayerGauge';
import { ThemeScope } from '../ThemeScope/ThemeScope';
import styles from './HomePlayerCard.module.css';

const CLOSE_ICON_SIZE = 16;
const EXPAND_ICON_SIZE = 18;
const ALL_ICON_SIZE = 14;

/** 播放卡頂嘅頁頭列：細碟 + 節目名 + ⤢，成條撳得入節目 / 劇集頁 */
interface CardHeaderProps {
    name: string;
    art: string | undefined;
    openLabel: string;
    onExpand: () => void;
    focusOnMount: boolean;
}

const CardHeader = ({ name, art, openLabel, onExpand, focusOnMount }: CardHeaderProps) => (
    <button
        type="button"
        className={styles.header}
        aria-label={openLabel}
        onClick={onExpand}
        // 用戶撳把手再出返張卡：焦點跟去張卡（自動因播放再出返就唔搶焦點，S-630）
        autoFocus={focusOnMount}
    >
        <Disc size="small" art={art} />
        <span className={styles.name} style={{ viewTransitionName: TRANSITION_NAME.title }}>
            {name}
        </span>
        <span className={styles.expand} aria-hidden="true">
            <ExpandIcon size={EXPAND_ICON_SIZE} />
        </span>
    </button>
);

export interface HomeCardNext {
    items: EpisodeItem[];
    labels: EpisodeLabels;
    onSelect: (key: string) => void;
    /** 「全部 ›」：入頁睇成張清單 */
    onAll: () => void;
}

/** 「下一集」：同內頁集數清單一樣嘅行，標題右邊「全部 ›」 */
const CardNext = ({ items, labels, onSelect, onAll }: HomeCardNext) => (
    <div className={styles.next}>
        <EpisodeList
            items={items}
            onSelect={onSelect}
            labels={labels}
            title={t('homeCard.next')}
            aside={
                <button
                    type="button"
                    className={styles.all}
                    aria-label={t('homeCard.allLabel')}
                    onClick={onAll}
                >
                    {t('homeCard.all')}
                    <BackIcon className={styles.allIcon} size={ALL_ICON_SIZE} />
                </button>
            }
        />
    </div>
);

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

interface HomePlayerCardProps {
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
 * （頁頭列、唱片 + 弧形進度 + 播放掣、現正播放；高畫面多「下一集」）。✕ 半浮喺卡右上角
 */
export const HomePlayerCard = ({ theme, gauge, next, ...props }: HomePlayerCardProps) => (
    <ThemeScope theme={theme} fullPage={false} className={styles.scope}>
        <section
            className={styles.card}
            aria-label={props.region}
            style={{ viewTransitionName: TRANSITION_NAME.panel }}
        >
            <CardHeader
                name={props.showName}
                art={theme.art}
                openLabel={props.openLabel}
                onExpand={props.onExpand}
                focusOnMount={props.focusOnMount ?? false}
            />
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
