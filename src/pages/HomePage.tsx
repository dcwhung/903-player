import { useNavigate } from 'react-router-dom';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { ShowGrid } from '../components/ShowGrid/ShowGrid';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { APP_VERSION } from '../config/appVersion';
import { SHORT_LANDSCAPE_QUERY } from '../config/layout';
import { HOME_THEME, SHOW_THEMES } from '../config/showThemes';
import { SHOWS } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useNewShowIds } from '../hooks/useNewShowIds';
import { useStartPlayback } from '../hooks/useStartPlayback';
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

export const HomePage = () => {
    const { status } = useRecordings();
    const tiles = useHomeTiles();
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
                {miniPlayer && <MiniPlayer {...miniPlayer} />}
            </main>
        </ThemeScope>
    );
};
