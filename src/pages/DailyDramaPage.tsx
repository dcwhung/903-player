import { EpisodeList } from '../components/EpisodeList/EpisodeList';
import { NowPlaying } from '../components/NowPlaying/NowPlaying';
import { PlayerPanel } from '../components/PlayerPanel/PlayerPanel';
import { StatusMessage } from '../components/StatusMessage/StatusMessage';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import type { DramaConfig } from '../dramas';
import { LANDSCAPE_QUERY } from '../config/layout';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePlayer } from '../player/usePlayer';
import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import { hasKnownDuration } from '../utils/time';
import { DramaHeader } from './DramaHeader';
import page from './Page.module.css';
import { useDailyDramaPage } from './useDramaPage';

/**
 * 每日劇集：同節目頁一樣嘅版面（唱片 + 日子條，直版下面 / 橫版左欄集數清單）。
 * 成頁固定唔捲，得集數清單自己捲（Page.module.css .locked / .fixed）。
 * 播緊其他嘢（start 有值）：黑碟、未開始樣，同短篇劇集頁一樣
 */
export const DailyDramaPage = ({ drama }: { drama: DramaConfig }) => {
    const { theme, current, start, strip, items, selectEpisode, pressEpisode } =
        useDailyDramaPage(drama);
    const { duration } = usePlayer();
    const landscape = useMediaQuery(LANDSCAPE_QUERY);
    const dateLabel = current ? formatDateLabel(current.date) : '';
    // 橫版頁頭喺左欄清單上面（清單成日都有）
    return (
        <ThemeScope theme={theme}>
            <main className={`${page.page} ${page.locked} ${page.fixed}`} data-player-page="">
                <div className={page.playerColumn}>
                    {!landscape && <DramaHeader title={drama.name} />}
                    {!current && <StatusMessage message={t('episodes.noneUp')} />}
                    {current && (
                        <PlayerPanel
                            title={drama.name}
                            dateLabel={dateLabel}
                            art={start ? undefined : theme.art}
                            days={strip.days}
                            currentDay={strip.current}
                            onPick={selectEpisode}
                            onStart={start}
                        />
                    )}
                    {current && landscape && (
                        <NowPlaying
                            label={dateLabel}
                            connecting={!start && !hasKnownDuration(duration)}
                        />
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
