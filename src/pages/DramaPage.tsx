import { useParams } from 'react-router-dom';
import { ArcPicker } from '../components/ArcPicker/ArcPicker';
import { ArcSheet } from '../components/ArcSheet/ArcSheet';
import { EpisodeList } from '../components/EpisodeList/EpisodeList';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { PlayerGauge } from '../components/PlayerPanel/PlayerGauge';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { NEUTRAL_THEME } from '../config/showThemes';
import { findEnabledDrama, type DramaConfig } from '../config/dramas';
import { useGoHome } from '../hooks/useGoHome';
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

/**
 * 每日劇集：同節目頁一樣嘅版面（唱片 + 日子條，右 / 下面集數清單）。
 * 成頁固定唔捲，得集數清單自己捲（Page.module.css .locked / .fixed）
 */
const DailyDramaPage = ({ drama }: { drama: DramaConfig }) => {
    const { theme, current, strip, items, selectEpisode, pressEpisode } = useDailyDramaPage(drama);
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.playerColumn}>
                    <DramaHeader title={drama.name} />
                    {!current && <StatusMessage message={t('episodes.noneUp')} />}
                    {current && (
                        <PlayerPanel
                            title={drama.name}
                            dateLabel={formatDateLabel(current.date)}
                            art={theme.art}
                            days={strip.days}
                            currentDay={strip.current}
                            onPick={selectEpisode}
                        />
                    )}
                </div>
                <div className={page.listColumn}>
                    <EpisodeList items={items} onSelect={pressEpisode} labels="taggedDate" />
                </div>
            </main>
        </ThemeScope>
    );
};

/**
 * 短篇劇集：唱片下面（橫版右欄頂）係「現正播放」+ 短篇 chips，揀短篇換下面嘅集數清單。
 * chips 喺清單嗰欄：直版次序同節目頁一樣（唱片 → 60px 一組 → 清單），橫版跟清單去右欄
 */
const SeriesDramaPage = ({ drama }: { drama: DramaConfig }) => {
    const { theme, current, arcs, arc, pickArc, items, pressEpisode, sheet } =
        useSeriesDramaPage(drama);
    const { duration, isPlaying, recording } = usePlayer();
    const label = arcPickerLabel(duration, current);
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`}>
                <div className={page.playerColumn}>
                    <DramaHeader title={drama.name} />
                    {current ? (
                        <PlayerGauge art={theme.art} />
                    ) : (
                        <StatusMessage message={t('episodes.noneUp')} />
                    )}
                </div>
                <div className={page.listColumn}>
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
                <ArcSheet
                    open={sheet.open}
                    summaries={sheet.summaries}
                    current={recording === current ? current : undefined}
                    isPlaying={isPlaying}
                    onPick={sheet.pick}
                    onPlay={sheet.play}
                    onClose={sheet.close}
                />
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
