import { ItemInfoSheet } from '../../components/shared/common/ItemInfo/ItemInfoSheet';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { NowPlaying } from '../../components/shared/player/NowPlaying/NowPlaying';
import { PlayerPanel } from '../../components/shared/player/PlayerPanel/PlayerPanel';
import { DUO_OPEN_PORTRAIT_QUERY } from '../../config/layout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { formatDateLabel, formatSpokenDate } from '../../utils/date';
import { hasKnownDuration } from '../../utils/time';
import type { useShowPage } from './useShowPage';

type ShowPlayerProps = Pick<
    ReturnType<typeof useShowPage>,
    'theme' | 'current' | 'start' | 'strip' | 'selectEpisode' | 'info'
> & {
    title: string;
    landscape: boolean;
    /** HomeView：ⓘ 喺頁頭（PageHeaderActions），唱片圈唔再出 */
    infoInHeader: boolean;
};

/**
 * 有集數播得就係播放器（橫版下面加「現正播放」，直版喺日子條上面）；
 * 未有就講「未有集數上架」（清單照列出未上架嘅，撳唔到）。
 * 播緊其他嘢（start 有值）：節目碟面、未開始樣，撳播放先開始播呢個節目
 */
export const ShowPlayer = ({
    title,
    theme,
    current,
    start,
    strip,
    selectEpisode,
    info,
    landscape,
    infoInHeader,
}: ShowPlayerProps) => {
    const { duration } = usePlayer();
    // Duo 打開・直（P10 lane 5b）：日子直排喺唱片右邊
    const stripSide = useMediaQuery(DUO_OPEN_PORTRAIT_QUERY);
    if (!current) {
        return <StatusMessage message={t('episodes.noneUp')} />;
    }
    const dateLabel = formatDateLabel(current.date);
    return (
        <>
            <PlayerPanel
                title={title}
                // 日子條嘅日子淨係畀讀屏用：讀「17/10 星期六」
                dateLabel={formatSpokenDate(current.date)}
                // 未揀集 / 播緊其他嘢（未開始樣）都照顯示節目碟面，唔再用黑碟（劇集頁唔變）
                art={theme.art}
                days={strip.days}
                currentDay={strip.current}
                onPick={selectEpisode}
                onStart={start}
                bookmark={current}
                stripSide={stripSide}
                {...(infoInHeader ? undefined : info.gaugeInfo)}
            />
            {landscape && (
                <NowPlaying
                    label={dateLabel}
                    spokenLabel={formatSpokenDate(current.date)}
                    connecting={!start && !hasKnownDuration(duration)}
                />
            )}
            {/* 節目資料：橫版喺唱片嗰欄（docked），直版由畫面底彈出 */}
            <ItemInfoSheet {...info.sheet} onClose={info.sheet.close} docked={landscape} />
        </>
    );
};
