import { useParams } from 'react-router-dom';
import { ArcPicker } from '../components/ArcPicker/ArcPicker';
import { ArcSheet } from '../components/ArcSheet/ArcSheet';
import { EpisodeList } from '../components/EpisodeList/EpisodeList';
import { NowPlaying } from '../components/NowPlaying/NowPlaying';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerGauge } from '../components/PlayerPanel/PlayerGauge';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { NEUTRAL_THEME } from '../config/showThemes';
import { findEnabledDrama, type DramaConfig } from '../config/dramas';
import { LANDSCAPE_QUERY } from '../config/layout';
import { useGoHome } from '../hooks/useGoHome';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePlayer } from '../player/usePlayer';
import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import type { SeriesEpisode } from '../types/drama';
import { hasKnownDuration } from '../utils/time';
import page from './Page.module.css';
import { useDailyDramaPage, useSeriesDramaPage } from './useDramaPage';

/** 劇名做頁頭標題（同節目頁一樣） */
const DramaHeader = ({ title }: { title: string }) => {
    const goHome = useGoHome();
    return (
        <div className={page.header}>
            <PageHeader title={title} variant="title" onBack={goHome} />
        </div>
    );
};

/** 短篇 chips 上面嗰行：同日子條一樣，未讀到時長講「連線中…」，否則「現正播放：第 N 集 集名」 */
const arcPickerLabel = (duration: number, current: SeriesEpisode | undefined): string => {
    if (!hasKnownDuration(duration)) return t('episodes.connecting');
    if (!current) return '';
    const episodeNo = t('drama.episodeNo', { no: current.no });
    const label = current.title
        ? t('drama.nowPlayingShort', { no: current.no, title: current.title })
        : episodeNo;
    return t('drama.nowPlaying', { label });
};

/** 橫版唱片下面「現正播放」：短篇加埋第幾個 / 幾多集（按排位，唔係集數），下一行集名 */
const seriesNowPlaying = (current: SeriesEpisode, arcPosition: number, arcTotal: number) => ({
    label: t('drama.nowPlayingArc', { arc: current.arc, no: arcPosition, total: arcTotal }),
    detail: current.title,
});

/**
 * 每日劇集：同節目頁一樣嘅版面（唱片 + 日子條，直版下面 / 橫版左欄集數清單）。
 * 成頁固定唔捲，得集數清單自己捲（Page.module.css .locked / .fixed）
 */
const DailyDramaPage = ({ drama }: { drama: DramaConfig }) => {
    const { theme, current, strip, items, selectEpisode, pressEpisode } = useDailyDramaPage(drama);
    const { duration } = usePlayer();
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const dateLabel = current ? formatDateLabel(current.date) : '';
    // 橫版頁頭喺左欄清單上面（清單成日都有）
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.playerColumn}>
                    {!landscape && <DramaHeader title={drama.name} />}
                    {!current && <StatusMessage message={t('episodes.noneUp')} />}
                    {current && (
                        <PlayerPanel
                            title={drama.name}
                            dateLabel={dateLabel}
                            art={theme.art}
                            days={strip.days}
                            currentDay={strip.current}
                            onPick={selectEpisode}
                        />
                    )}
                    {current && landscape && (
                        <NowPlaying label={dateLabel} connecting={!hasKnownDuration(duration)} />
                    )}
                </div>
                <div className={page.listColumn}>
                    {landscape && <DramaHeader title={drama.name} />}
                    <EpisodeList items={items} onSelect={pressEpisode} labels="taggedDate" />
                </div>
            </main>
        </ThemeScope>
    );
};

/**
 * 短篇劇集：直版唱片下面係「現正播放」+ 短篇 chips，揀短篇換下面嘅集數清單（次序同節目頁一樣：
 * 唱片 → 60px 一組 → 清單）。橫版 chips 跟清單喺左欄（頁頭下面），「現正播放」搬去右欄唱片下面；
 * 全集表橫版只蓋左欄（listBody），唔遮播放器
 */
const SeriesDramaPage = ({ drama }: { drama: DramaConfig }) => {
    const {
        theme,
        current,
        arcTotal,
        arcPosition,
        arcs,
        arc,
        pickArc,
        items,
        pressEpisode,
        sheet,
    } = useSeriesDramaPage(drama);
    const { duration, isPlaying, recording } = usePlayer();
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const label = arcPickerLabel(duration, current);
    const arcSheet = (
        <ArcSheet
            open={sheet.open}
            docked={landscape}
            groups={sheet.groups}
            current={recording === current ? current : undefined}
            isPlaying={isPlaying}
            onPick={sheet.pick}
            onPlay={sheet.play}
            onClose={sheet.close}
        />
    );
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div
                    className={`${page.playerColumn} ${current?.title ? page.detailedNowPlaying : ''}`}
                >
                    {!landscape && <DramaHeader title={drama.name} />}
                    {current ? (
                        <PlayerGauge art={theme.art} />
                    ) : (
                        <StatusMessage message={t('episodes.noneUp')} />
                    )}
                    {current && landscape && (
                        <NowPlaying
                            {...seriesNowPlaying(current, arcPosition, arcTotal)}
                            connecting={!hasKnownDuration(duration)}
                        />
                    )}
                </div>
                <div className={page.listColumn}>
                    {landscape && <DramaHeader title={drama.name} />}
                    <div className={page.listBody}>
                        {/* 橫版全集表蓋住 chips + 清單：下面嗰啲 inert，Tab / 讀屏唔會入到睇唔見嘅嘢 */}
                        <div className={page.listContent} inert={landscape && sheet.open}>
                            <ArcPicker
                                arcs={arcs}
                                selected={arc}
                                playing={current?.arc}
                                label={label}
                                onPick={pickArc}
                                onOpenAll={sheet.openSheet}
                            />
                            <EpisodeList items={items} onSelect={pressEpisode} labels="title" />
                        </div>
                        {landscape && arcSheet}
                    </div>
                </div>
                {!landscape && arcSheet}
            </main>
        </ThemeScope>
    );
};

export const DramaPage = () => {
    const { dramaId = '' } = useParams();
    const drama = findEnabledDrama(dramaId);
    if (!drama) {
        return (
            <ThemeScope theme={NEUTRAL_THEME}>
                <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                    <DramaHeader title="" />
                    <StatusMessage message={t('drama.notFound')} />
                </main>
            </ThemeScope>
        );
    }
    return drama.kind === 'series' ? (
        <SeriesDramaPage drama={drama} />
    ) : (
        <DailyDramaPage drama={drama} />
    );
};
