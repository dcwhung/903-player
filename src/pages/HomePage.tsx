import { useNavigate } from 'react-router-dom';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { WIDE_BANNER_QUERY } from '../config/layout';
import { SHOWS } from '../shows';
import { HOME_THEME } from '../config/showThemes';
import { useRecordings } from '../data/useRecordings';
import { useAudioBusy } from '../hooks/useAudioBusy';
import { useDramaItems } from './useHomeDramaItems';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useHomePlayerCardClosed } from '../hooks/homePlayerCardClosed';
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
import { homeLayoutMode } from './homeLayoutMode';
import { HomeStack } from './HomeStack';
import { HomeWide } from './HomeWide';

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

/** 用邊款版面（homeLayoutMode）：闊橫版睇有冇 mini player、播放卡收埋咗未 */
const useLayoutMode = (hasMiniPlayer: boolean) => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const cardClosed = useHomePlayerCardClosed();
    return homeLayoutMode({ wide, hasMiniPlayer, cardClosed });
};

export const HomePage = () => {
    const { status } = useRecordings();
    const [tab, setTab] = useHomeTab();
    const miniPlayer = useMiniPlayer();
    const mode = useLayoutMode(miniPlayer !== null);
    useHomeArrival();
    const props = {
        tab,
        onTab: setTab,
        showTiles: useHomeTiles(),
        dramaItems: useDramaItems(),
        busy: status === 'loading',
        miniPlayer,
    };
    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player / 播放卡入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {mode === 'stack' ? <HomeStack {...props} /> : <HomeWide {...props} mode={mode} />}
        </ThemeScope>
    );
};
