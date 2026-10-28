import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { airsWeekly, findShow, themeFor, type ShowConfig } from '../shows';
import { useRecordings } from '../data/useRecordings';
import { useEpisodePress } from '../hooks/useEpisodePress';
import { useAudioBusy } from '../hooks/useAudioBusy';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { useStandbyStart } from '../hooks/useStandbyStart';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { usePlayer } from '../player/usePlayer';
import {
    entriesNewestFirst,
    episodesNewestFirst,
    pickInitialRecording,
    recordingsForShow,
} from '../selectors/recordings';
import { stripDays } from '../components/DateStrip/dateStrip';
import { getProgressMap } from '../services/progressStore';
import { hkToday } from '../utils/date';
import type { Recording } from '../types/recording';
import type { ShowPageState } from '../types/showPageState';
import { asShowRecording } from '../types/track';
import { toEpisodeItems } from './episodeItems';

/** 呢個節目嘅集數同揀中嗰集：播緊呢個節目就用播緊嗰集，否則用預設嗰集 */
const useShowEpisodes = (show: ShowConfig | undefined) => {
    const { recordings, unavailable } = useRecordings();
    const player = usePlayer();
    const episodes = useMemo(
        () => (show ? episodesNewestFirst(recordings, show.id) : []),
        [show, recordings],
    );
    // 集數清單：播得到嘅加埋未上架嘅（日子條同播放器只用播得到嘅 episodes）
    const entries = useMemo(
        () => (show ? entriesNewestFirst(recordings, unavailable, show.id) : []),
        [show, recordings, unavailable],
    );
    const loaded = asShowRecording(player.recording);
    const playing = loaded?.showId === show?.id ? loaded : null;
    const current =
        playing ??
        (show
            ? pickInitialRecording(recordingsForShow(recordings, show.id), hkToday())
            : undefined);
    return { episodes, entries, playing, current };
};

/**
 * 帶入嚟要播嘅集（S-507）：同一個節目有重溫又有今日，由今日嗰項撳入就播今日，唔係跟住播緊嘅舊集。
 * 清單載入完就清走 history state（搵唔搵到都清，S-531），之後 refresh 清單或者返上一頁再入唔會再觸發
 */
const useRequestedEpisode = (episodes: readonly Recording[]) => {
    const location = useLocation();
    const navigate = useNavigate();
    const url = (location.state as ShowPageState | null)?.url;
    const requested = url === undefined ? undefined : episodes.find((e) => e.url === url);
    const { pathname } = location;
    const consume = useCallback(
        () => void navigate(pathname, { replace: true, state: null }),
        [navigate, pathname],
    );
    return { hasRequest: url !== undefined, requested, consume };
};

/**
 * 入頁（主頁撳格、deep link）冇其他嘢佔住（useAudioBusy）先自動播；有其他嘢播緊 / 暫停緊就唔蓋過
 * （用戶可能只係想睇清單），唱片係未開始樣等用戶撳。mini player 帶咗集數入嚟係明確要播，照播嗰集
 */
const useAutoplayShow = (
    show: ShowConfig | undefined,
    episodes: readonly Recording[],
    playingUrl: string | undefined,
) => {
    const { status } = useRecordings();
    const { load } = usePlayer();
    const busy = useAudioBusy();
    const { startShow } = useStartPlayback();
    const { hasRequest, requested, consume } = useRequestedEpisode(episodes);
    useEffect(() => {
        if (!show || status !== 'ready') return;
        if (hasRequest) consume();
        if (requested && requested.url !== playingUrl) {
            void load(requested, { autoplay: true });
        } else if (!requested && playingUrl === undefined && !busy) {
            startShow(show.id);
        }
    }, [show, status, hasRequest, requested, consume, playingUrl, busy, load, startShow]);
};

/**
 * 日子條嘅日子：memo 係因為播緊時每秒幾次 re-render，唔使每次重砌成段歷史；
 * 一星期播一日嘅節目只排有集數嘅日子（冇灰色日子）
 */
const useShowStrip = (
    show: ShowConfig | undefined,
    episodes: readonly Recording[],
    currentUrl: string | undefined,
) => {
    const episodeDaysOnly = show !== undefined && airsWeekly(show);
    return useMemo(
        () => stripDays(episodes, currentUrl, { episodeDaysOnly }),
        [episodes, currentUrl, episodeDaysOnly],
    );
};

/** 撳播放先開始播呢個節目：播緊其他嘢先有（見 useStandbyStart） */
const useShowStart = (show: ShowConfig | undefined, isThisShow: boolean) => {
    const { startShow } = useStartPlayback();
    return useStandbyStart(isThisShow, () => {
        if (show) startShow(show.id);
    });
};

/**
 * 集數清單每行：只有載入緊呢個節目先用 player 即時時間、先當播緊；
 * 未載入（未開始播，或者播緊其他嘢）揀中集係預設嗰集，用返 localStorage 進度
 */
const useShowEpisodeItems = (
    entries: Parameters<typeof toEpisodeItems>[0],
    currentUrl: string | undefined,
    isThisShow: boolean,
) => {
    const player = usePlayer();
    // 轉集或者有集數變成聽過先重新讀 localStorage
    const progressMap = useRefreshedOn(getProgressMap, [player.watchedRevision, currentUrl]);
    const live = isThisShow
        ? { currentTime: player.currentTime, duration: player.duration }
        : undefined;
    const isPlayingCurrent = isThisShow && player.isPlaying;
    const episodeItems = toEpisodeItems(entries, currentUrl, live, progressMap, isPlayingCurrent);
    return { episodeItems, isPlayingCurrent };
};

/** 節目頁嘅資料同動作 */
export const useShowPage = (showId: string) => {
    const show = findShow(showId);
    const { status, isSearching } = useRecordings();
    const { episodes, entries, playing, current } = useShowEpisodes(show);
    useAutoplayShow(show, episodes, playing?.url);
    const start = useShowStart(show, playing !== null);
    const currentUrl = current?.url;
    const { episodeItems, isPlayingCurrent } = useShowEpisodeItems(
        entries,
        currentUrl,
        playing !== null,
    );

    // 集數清單：撳播緊嗰集就暫停（掣係暫停樣），其他同日子條一樣播嗰集
    const press = useEpisodePress(episodes, currentUrl, isPlayingCurrent);
    return {
        show,
        theme: themeFor(show?.id),
        status,
        isSearching,
        current,
        start,
        episodeItems,
        // 日子條：同撳集數行同一條路（未聽完續播、聽過由頭播）
        strip: useShowStrip(show, episodes, currentUrl),
        selectEpisode: press.selectEpisode,
        pressEpisode: press.pressEpisode,
    };
};
