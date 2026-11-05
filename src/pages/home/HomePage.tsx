import { ShowTile } from '../../components/pages/home/ShowTile/ShowTile';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY } from '../../config/layout';
import { SHOWS } from '../../catalog/shows';
import { HOME_THEME } from '../../config/showThemes';
import { useRecordings } from '../../data/useRecordings';
import { useAudioBusy } from '../../hooks/useAudioBusy';
import { useDramaItems } from './useHomeDramaItems';
import { useHomeArrival } from '../../hooks/useHomeArrival';
import { useClosedHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { useHomeTab } from '../../hooks/useHomeTab';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMiniPlayer } from '../../hooks/useMiniPlayer';
import { useNewShowIds } from '../../hooks/useNewShowIds';
import { useStartPlayback } from '../../hooks/useStartPlayback';
import { usePlayer } from '../../player/usePlayer';
import { pickTodayDate, todayRecordings } from '../../selectors/recordings';
import { homeSideOf } from '../../selectors/wideZoomMotion';
import type { ShowId } from '../../types/recording';
import { asShowRecording } from '../../types/track';
import { zoomKey } from '../../utils/cardZoom';
import { hkToday } from '../../utils/date';
import { t } from '../../i18n/t';
import styles from './HomePage.module.css';
import { homeLayoutMode } from './homeLayoutMode';
import { HomeStack } from './HomeStack';
import { HomeWide } from './HomeWide';
import { HomeSaved } from './HomeSaved';
import { useKnownBookmarks } from './useSavedView';
import { useTileOpen, type HomeRight } from './useTileOpen';
import type { SavedLayout } from '../../selectors/bookmarks';

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

/** 今日節目格：撳落按 useTileAutoplay 順便開始播，入今日節目頁（把手按嗰頁列緊嘅日子，同 TodayPage） */
const useTodayTile = (open: ReturnType<typeof useTileOpen>) => {
    const { startToday } = useStartPlayback();
    const { canStartToday } = useTileAutoplay();
    const { recordings } = useRecordings();
    const date = pickTodayDate(recordings, hkToday());
    return (
        <ShowTile
            key="today"
            variant="today"
            label={t('home.today')}
            zoomKey={zoomKey.today}
            onClick={() => {
                // 用實際有冇開到播（S-682）：未 ready / 冇錄音就當冇開播，內頁照出把手
                const starts = canStartToday() && startToday();
                open({ key: zoomKey.today, path: '/today', page: { kind: 'today', date }, starts });
            }}
        />
    );
};

/**
 * 7 個節目格（今日有新一集就有「New」）+ 今日節目格：撳落按 useTileAutoplay 順便開始播，
 * 再入頁（過場按主頁右邊有乜揀，useTileOpen）
 */
const useHomeTiles = (right: HomeRight) => {
    const open = useTileOpen(right);
    const { startShow } = useStartPlayback();
    const { canStartShow } = useTileAutoplay();
    const newShowIds = useNewShowIds();
    const today = useTodayTile(open);
    return [
        ...SHOWS.map((show) => (
            <ShowTile
                key={show.id}
                label={show.name}
                art={show.tileArt}
                isNew={newShowIds.has(show.id)}
                zoomKey={zoomKey.show(show.id)}
                onClick={() => {
                    const starts = canStartShow(show.id) && startShow(show.id);
                    const page = { kind: 'show', showId: show.id } as const;
                    open({ key: zoomKey.show(show.id), path: `/show/${show.id}`, page, starts });
                }}
            />
        )),
        today,
    ];
};

/** 用邊款版面（homeLayoutMode）：闊橫版睇有冇 mini player、播放卡畀 ✕ 閂咗未 */
const useLayoutMode = (hasMiniPlayer: boolean) => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const cardClosed = useClosedHomePlayerCard() !== null;
    return homeLayoutMode({ wide, hasMiniPlayer, cardClosed });
};

/** 收藏 tab 版面：闊橫版 wide；手機打橫 land；其他（直版）phone */
const useSavedLayout = (mode: ReturnType<typeof homeLayoutMode>): SavedLayout => {
    const sideways = useMediaQuery(SHORT_LANDSCAPE_QUERY);
    if (mode !== 'stack') return 'wide';
    return sideways ? 'land' : 'phone';
};

export const HomePage = () => {
    const { status } = useRecordings();
    const hasSaved = useKnownBookmarks().length > 0;
    const [tab, setTab] = useHomeTab(hasSaved);
    const miniPlayer = useMiniPlayer();
    const mode = useLayoutMode(miniPlayer !== null);
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
        dramaItems: useDramaItems(right),
        busy: status === 'loading',
        miniPlayer,
        hasSaved,
        saved: <HomeSaved layout={savedLayout} right={right} />,
    };
    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player / 播放卡入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {mode === 'stack' ? <HomeStack {...props} /> : <HomeWide {...props} mode={mode} />}
        </ThemeScope>
    );
};
