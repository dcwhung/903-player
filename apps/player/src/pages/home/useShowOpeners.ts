import { hkToday, type ShowConfig } from '@903-player/catalog';
import { useRecordings } from '../../data/useRecordings';
import { useAudioBusy } from '../../hooks/useAudioBusy';
import { useStartPlayback } from '../../hooks/useStartPlayback';
import { usePlayer } from '../../player/usePlayer';
import { pickTodayDate, todayRecordings } from '../../selectors/recordings';
import type { ShowId } from '../../types/recording';
import { asShowRecording } from '../../types/track';
import { zoomKey } from '../../utils/cardZoom';
import { useTileOpen, type HomeRight } from './useTileOpen';

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

/**
 * 主頁撳節目 / 今日節目（節目格同新主頁疊卡共用）：按 useTileAutoplay 順便開始播，
 * 再入頁（過場按主頁右邊有乜揀，useTileOpen）
 */
export const useShowOpeners = (right: HomeRight) => {
    const open = useTileOpen(right);
    const { startShow, startToday } = useStartPlayback();
    const { canStartShow, canStartToday } = useTileAutoplay();
    const { recordings } = useRecordings();
    const date = pickTodayDate(recordings, hkToday());
    return {
        openShow: (show: ShowConfig) => {
            const starts = canStartShow(show.id) && startShow(show.id);
            const page = { kind: 'show', showId: show.id } as const;
            open({ key: zoomKey.show(show.id), path: `/show/${show.id}`, page, starts });
        },
        // 今日節目：用實際有冇開到播（S-682）：未 ready / 冇錄音就當冇開播，內頁照出把手
        openToday: () => {
            const starts = canStartToday() && startToday();
            open({ key: zoomKey.today, path: '/today', page: { kind: 'today', date }, starts });
        },
    };
};

export type ShowOpeners = ReturnType<typeof useShowOpeners>;
