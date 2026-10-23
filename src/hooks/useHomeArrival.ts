import { useEffect, useRef, useState } from 'react';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import type { Recording } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';
import { hkToday } from '../utils/date';

/**
 * 入嚟主頁嗰刻播緊嘅錄音，係咪 mini player 會顯示嘅其中一個
 * （今日；今日冇節目播先用最近一日）。廣播劇：mini player 顯示返嗰套劇，一定係
 */
export const isListedByMiniPlayer = (
    arrivedWith: Track | null,
    recordings: Recording[],
    today: string,
): boolean =>
    arrivedWith !== null &&
    (isDramaEpisode(arrivedWith) ||
        todayRecordings(recordings, today).some((r) => r.url === arrivedWith.url));

/**
 * 返到主頁時決定繼續播定停：mini player 有顯示嗰集就繼續播，否則暫停並存進度。
 * 只睇入嚟嗰刻嘅錄音；錄音列表未載入就等載入完先決定，每次入嚟只決定一次。
 */
export const useHomeArrival = (): void => {
    const { status, recordings } = useRecordings();
    const { recording, stop } = usePlayer();
    const [arrivedWith] = useState(recording);
    const decided = useRef(false);

    useEffect(() => {
        // 冇嘢播緊就唔使等列表；列表載入失敗就當唔喺今日節目
        const canDecide = arrivedWith === null || status !== 'loading';
        if (decided.current || !canDecide) {
            return;
        }
        decided.current = true;
        if (!isListedByMiniPlayer(arrivedWith, recordings, hkToday())) {
            stop();
        }
    }, [arrivedWith, status, recordings, stop]);
};
