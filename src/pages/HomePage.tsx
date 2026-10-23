import { useNavigate } from 'react-router-dom';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { DramaShelf, type DramaShelfItem } from '../components/DramaShelf/DramaShelf';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { HomeTabs } from '../components/HomeTabs/HomeTabs';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { ShowGrid } from '../components/ShowGrid/ShowGrid';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { APP_VERSION } from '../config/appVersion';
import { DRAMA_TILE_ART } from '../config/dramaThemes';
import { enabledDramas, type DramaConfig } from '../config/dramas';
import { SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { HOME_THEME, SHOW_THEMES } from '../config/showThemes';
import { SHOWS } from '../config/shows';
import { seriesEpisodesOf } from '../data/dramaCatalog';
import { useRecordings } from '../data/useRecordings';
import { useDramaContinue } from '../hooks/useDramaContinue';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useHomeTab } from '../hooks/useHomeTab';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useNewDramaIds } from '../hooks/useNewDramaIds';
import { useNewShowIds } from '../hooks/useNewShowIds';
import { useStartDrama } from '../hooks/useStartDrama';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { seriesArcs } from '../selectors/dramas';
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
                art={SHOW_THEMES[show.id].art}
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

/** 劇集格右下角：短篇劇集「N 個短篇」，每日劇集「每日更新」 */
const dramaMeta = (drama: DramaConfig): string =>
    drama.kind === 'series'
        ? t('drama.arcCount', { count: seriesArcs(seriesEpisodesOf(drama.id)).length })
        : t('drama.daily');

/** 廣播劇 tab 嘅劇集格（撳落開始播再入頁，同節目格一樣） */
const useDramaItems = (): DramaShelfItem[] => {
    const navigate = useNavigate();
    const startDrama = useStartDrama();
    const newDramaIds = useNewDramaIds();
    const continueOf = useDramaContinue();
    return enabledDramas().map((drama) => ({
        id: drama.id,
        name: drama.name,
        art: DRAMA_TILE_ART[drama.id],
        meta: dramaMeta(drama),
        isNew: newDramaIds.has(drama.id),
        resume: continueOf(drama),
        onOpen: () => {
            startDrama(drama);
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
    // 手機打橫：橫額變成節目格第一格（佔兩欄），同節目排成 5 欄 × 2 行；其他情況釘喺頂
    const bannerInGrid = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    const banner = <HomeBanner corner={<AppVersion version={APP_VERSION} />} />;

    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player 入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {/* 主頁任何高度都固定唔捲（page.locked）：橫額釘喺頂，節目格放唔落就分頁（橫版一頁放晒） */}
            <main className={`${page.page} ${page.locked} ${styles.home}`}>
                {!bannerInGrid && banner}
                <HomeTabs tab={tab} onChange={setTab} />
                {tab === 'shows' ? (
                    <ShowGrid
                        label={t('home.showsNav')}
                        busy={status === 'loading'}
                        tiles={
                            bannerInGrid
                                ? [
                                      <div key="banner" className={styles.bannerTile}>
                                          {banner}
                                      </div>,
                                      ...tiles,
                                  ]
                                : tiles
                        }
                    />
                ) : (
                    <DramaShelf
                        items={dramaItems}
                        leading={bannerInGrid && <div className={styles.shelfBanner}>{banner}</div>}
                    />
                )}
                {miniPlayer && <MiniPlayer {...miniPlayer} />}
            </main>
        </ThemeScope>
    );
};
