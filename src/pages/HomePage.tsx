import { useNavigate } from 'react-router-dom';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { DramaShelf } from '../components/DramaShelf/DramaShelf';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { FittedBanner } from '../components/HomeLandscapeGrid/FittedBanner';
import { HomeTabs } from '../components/HomeTabs/HomeTabs';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { miniPlayerMode } from '../components/MiniPlayer/miniPlayerMode';
import { ShowGrid } from '../components/ShowGrid/ShowGrid';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { APP_VERSION } from '../config/appVersion';
import { SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { SHOWS } from '../shows';
import { HOME_THEME } from '../config/showThemes';
import { useRecordings } from '../data/useRecordings';
import { useAudioBusy } from '../hooks/useAudioBusy';
import { useDramaItems } from './useHomeDramaItems';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useHomeTab } from '../hooks/useHomeTab';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useNewShowIds } from '../hooks/useNewShowIds';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import type { ShowId } from '../types/recording';
import { asShowRecording } from '../types/track';
import { hkToday } from '../utils/date';
import { t } from '../i18n/t';
import styles from './HomePage.module.css';
import page from './Page.module.css';

/**
 * 撳節目格 / 今日節目格時順便開始播嘅條件：冇其他嘢播緊 / 暫停緊（useAudioBusy），
 * 而且嗰個節目（今日節目格：今日任何一個節目）本身未載入。
 * 已載入就算 mini player 左滑關咗都唔播，保持暫停（S-538）
 */
const useTileAutoplay = () => {
    const busy = useAudioBusy();
    const { recording } = usePlayer();
    const { recordings } = useRecordings();
    const loadedShowId = asShowRecording(recording)?.showId;
    const todayLoaded = todayRecordings(recordings, hkToday()).some(
        (r) => r.url === recording?.url,
    );
    return {
        canStartShow: (showId: ShowId) => !busy && loadedShowId !== showId,
        canStartToday: () => !busy && !todayLoaded,
    };
};

/** 7 個節目格（今日有新一集就有「New」）+ 今日節目格：撳落入頁，按 useTileAutoplay 順便開始播 */
const useHomeTiles = () => {
    const navigate = useNavigate();
    const { startShow, startToday } = useStartPlayback();
    const { canStartShow, canStartToday } = useTileAutoplay();
    const newShowIds = useNewShowIds();
    return [
        ...SHOWS.map((show) => (
            <ShowTile
                key={show.id}
                label={show.name}
                art={show.tileArt}
                isNew={newShowIds.has(show.id)}
                onClick={() => {
                    if (canStartShow(show.id)) startShow(show.id);
                    navigate(`/show/${show.id}`);
                }}
            />
        )),
        <ShowTile
            key="today"
            variant="today"
            label={t('home.today')}
            onClick={() => {
                if (canStartToday()) startToday();
                navigate('/today');
            }}
        />,
    ];
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
