import { ShowTile } from '../../components/pages/home/ShowTile/ShowTile';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { SHORT_LANDSCAPE_LAYOUT_QUERY } from '../../config/layout';
import { allShows } from '../../catalog/shows';
import { HOME_THEME } from '../../config/showThemes';
import { useDramaItems } from './useHomeDramaItems';
import { useRecordings } from '../../data/useRecordings';
import { useHomeArrival } from '../../hooks/useHomeArrival';
import { useClosedHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { useHomeTab } from '../../hooks/useHomeTab';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWideHome } from '../../hooks/useWideHome';
import { useMiniPlayer } from '../../hooks/useMiniPlayer';
import { useNewShowIds } from '../../hooks/useNewShowIds';
import { homeSideOf } from '../../selectors/wideZoomMotion';
import { zoomKey } from '../../utils/cardZoom';
import { t } from '../../i18n/t';
import styles from './HomePage.module.css';
import { homeLayoutMode } from './homeLayoutMode';
import { HomeStack } from './HomeStack';
import { HomeWide } from './HomeWide';
import { HomeSaved } from './HomeSaved';
import { useThirdTab } from './useSavedView';
import type { HomeRight } from './useTileOpen';
import { useShowOpeners } from './useShowOpeners';
import { useShowShelfItems } from './useShowShelfItems';
import type { SavedLayout } from '../../selectors/bookmarks';

/**
 * 7 個節目格（今日有新一集就有「New」）+ 今日節目格：撳落按 useShowOpeners 順便開始播再入頁
 */
const useHomeTiles = (right: HomeRight) => {
    const { openShow, openToday } = useShowOpeners(right);
    const newShowIds = useNewShowIds();
    return [
        ...allShows().map((show) => (
            <ShowTile
                key={show.id}
                label={show.name}
                art={show.tileArt}
                isNew={newShowIds.has(show.id)}
                zoomKey={zoomKey.show(show.id)}
                onClick={() => openShow(show)}
            />
        )),
        <ShowTile
            key="today"
            variant="today"
            label={t('home.today')}
            zoomKey={zoomKey.today}
            onClick={openToday}
        />,
    ];
};

/** 用邊款版面（homeLayoutMode）：闊橫版睇有冇 mini player、播放卡畀 ✕ 閂咗未 */
const useLayoutMode = (hasMiniPlayer: boolean) => {
    const { wide } = useWideHome();
    const cardClosed = useClosedHomePlayerCard() !== null;
    return homeLayoutMode({ wide, hasMiniPlayer, cardClosed });
};

/** 收藏 tab 版面：闊橫版 wide；手機打橫 land；其他（直版）phone */
const useSavedLayout = (mode: ReturnType<typeof homeLayoutMode>): SavedLayout => {
    const sideways = useMediaQuery(SHORT_LANDSCAPE_LAYOUT_QUERY);
    if (mode !== 'stack') return 'wide';
    return sideways ? 'land' : 'phone';
};

export const HomePage = () => {
    const { status } = useRecordings();
    const third = useThirdTab();
    const [tab, setTab] = useHomeTab(third !== null);
    const miniPlayer = useMiniPlayer();
    const mode = useLayoutMode(miniPlayer !== null);
    const { shelf } = useWideHome();
    const savedLayout = useSavedLayout(mode);
    useHomeArrival();
    // 主頁右邊有乜：格仔入頁揀過場用（useTileOpen）
    const right: HomeRight = {
        side: homeSideOf(mode),
        card: mode === 'split' ? (miniPlayer?.item ?? null) : null,
    };
    const props = {
        tab,
        onTab: setTab,
        showTiles: useHomeTiles(right),
        showItems: useShowShelfItems(right),
        dramaItems: useDramaItems(right),
        busy: status === 'loading',
        miniPlayer,
        third,
        saved: <HomeSaved layout={savedLayout} right={right} />,
    };
    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player / 播放卡入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {mode === 'stack' ? (
                <HomeStack {...props} />
            ) : (
                <HomeWide {...props} mode={mode} shelf={shelf} />
            )}
        </ThemeScope>
    );
};
