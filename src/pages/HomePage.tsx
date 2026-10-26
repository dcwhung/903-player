import { useNavigate } from 'react-router-dom';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { DramaShelf, type DramaShelfItem } from '../components/DramaShelf/DramaShelf';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { FittedBanner } from '../components/HomeLandscapeGrid/FittedBanner';
import { HomeTabs } from '../components/HomeTabs/HomeTabs';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { miniPlayerMode } from '../components/MiniPlayer/miniPlayerMode';
import { ShowGrid } from '../components/ShowGrid/ShowGrid';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { APP_VERSION } from '../config/appVersion';
import { dramaEpisodesOf, enabledDramas, seriesEpisodesOf, type DramaConfig } from '../dramas';
import { SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { SHOWS } from '../shows';
import { HOME_THEME } from '../config/showThemes';
import { useRecordings } from '../data/useRecordings';
import { useDramaContinue } from '../hooks/useDramaContinue';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useHomeTab } from '../hooks/useHomeTab';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useDramaNewLabels } from '../hooks/useDramaNewLabels';
import { useNewShowIds } from '../hooks/useNewShowIds';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { isFirstSeriesVisit, useStartDrama } from '../hooks/useStartDrama';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { seriesArcs } from '../selectors/dramas';
import { dramaShelfOrder } from '../selectors/dramaShelf';
import { usePlayer } from '../player/usePlayer';
import { getProgressMap } from '../services/progressStore';
import { t } from '../i18n/t';
import styles from './HomePage.module.css';
import page from './Page.module.css';

/** 7 個節目格（今日有新一集就有「New」）+ 今日節目格（撳落開始播再入頁） */
const useHomeTiles = () => {
    const navigate = useNavigate();
    const { startShow, startToday } = useStartPlayback();
    const newShowIds = useNewShowIds();
    return [
        ...SHOWS.map((show) => (
            <ShowTile
                key={show.id}
                label={show.name}
                art={show.theme.art}
                isNew={newShowIds.has(show.id)}
                onClick={() => {
                    startShow(show.id);
                    navigate(`/show/${show.id}`);
                }}
            />
        )),
        <ShowTile
            key="today"
            variant="today"
            label={t('home.today')}
            onClick={() => {
                startToday();
                navigate('/today');
            }}
        />,
    ];
};

/** 劇集格右下角：短篇劇集「N 個短篇」（分季嘅「全 N 季」），每日劇集「每日更新」 */
const dramaMeta = (drama: DramaConfig): string => {
    if (drama.kind !== 'series') return t('drama.daily');
    const count = seriesArcs(seriesEpisodesOf(drama.id)).length;
    return t(drama.arcUnit === 'season' ? 'drama.seasonCount' : 'drama.arcCount', { count });
};

/** 廣播劇 tab 嘅劇集次序（見 dramaShelfOrder）；轉集、有集數聽完就按新進度重新排 */
const useShelfDramas = (): DramaConfig[] => {
    const player = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, player.recording]);
    return dramaShelfOrder(enabledDramas(), dramaEpisodesOf, progressMap);
};

/**
 * 廣播劇 tab 嘅劇集格（撳落開始播再入頁，同節目格一樣）。
 * 第一次入短篇劇集就淨係入頁（唔播、亦唔打斷播緊嘅嘢），等用戶喺全集表揀短篇
 */
const useDramaItems = (): DramaShelfItem[] => {
    const navigate = useNavigate();
    const startDrama = useStartDrama();
    const { recording } = usePlayer();
    const newLabels = useDramaNewLabels();
    const continueOf = useDramaContinue();
    const shelf = useShelfDramas();
    return shelf.map((drama) => ({
        id: drama.id,
        name: drama.name,
        art: drama.tileArt,
        meta: dramaMeta(drama),
        newLabel: newLabels.get(drama.id),
        resume: continueOf(drama),
        onOpen: () => {
            if (!isFirstSeriesVisit(drama, getProgressMap(), recording)) startDrama(drama);
            navigate(`/drama/${drama.id}`);
        },
    }));
};

export const HomePage = () => {
    const { status } = useRecordings();
    const tiles = useHomeTiles();
    const dramaItems = useDramaItems();
    const [tab, setTab] = useHomeTab();
    const miniPlayer = useMiniPlayer();
    useHomeArrival();
    // 手機打橫：橫額變成節目 / 劇集格第一格（HomeLandscapeGrid 按卡數排）；其他情況釘喺頂
    const bannerInGrid = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const version = <AppVersion version={APP_VERSION} />;
    const renderBanner = bannerInGrid
        ? (count: number) => (
              <HomeBanner
                  corner={version}
                  art={<FittedBanner count={count} miniPlayer={miniPlayer !== null} />}
              />
          )
        : undefined;

    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player 入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {/* 主頁任何高度都固定唔捲（page.locked）：橫額釘喺頂，節目格放唔落就分頁（手機打橫多過一屏就左右捲） */}
            <main
                className={`${page.page} ${page.locked} ${styles.home}`}
                data-mini-player={miniPlayer ? miniPlayerMode(miniPlayer.keys) : undefined}
            >
                {!bannerInGrid && <HomeBanner corner={version} />}
                <HomeTabs tab={tab} onChange={setTab} />
                {tab === 'shows' ? (
                    <ShowGrid
                        label={t('home.showsNav')}
                        busy={status === 'loading'}
                        tiles={tiles}
                        renderBanner={renderBanner}
                    />
                ) : (
                    <DramaShelf items={dramaItems} renderBanner={renderBanner} />
                )}
                {miniPlayer && <MiniPlayer {...miniPlayer} />}
            </main>
        </ThemeScope>
    );
};
