import { useEffect, useRef, useState } from 'react';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { todayRecordings } from '../selectors/recordings';
import type { Recording } from '../types/recording';
import { asShowRecording, type Track } from '../types/track';
import { hkToday } from '../utils/date';
import { pickedShow } from './showPick';

/** 返主頁照播嘅節目錄音：mini player 清單有，或者係用戶喺節目頁揀嘅（重溫，見 miniPlayerRecordings） */
const keepsShow = (show: Recording, recordings: Recording[]): boolean =>
    show.showId === pickedShow() ||
    todayRecordings(recordings, hkToday()).some((r) => r.url === show.url);

/**
 * 返到主頁時決定繼續播定停：mini player 會顯示嘅就繼續播——今日節目照常、廣播劇顯示嗰套劇、
 * 用戶喺節目頁揀嘅舊集排喺清單最前做「重溫」。冇嘢載入，或者係節目頁自動播嘅舊集
 * （mini player 唔會出）就停（存進度）。舊集要等清單載入完先分得到係唔係今日。每次入嚟只決定一次
 */
export const useHomeArrival = (): void => {
    const { recording, stop } = usePlayer();
    const { recordings, status } = useRecordings();
    const [arrivedWith] = useState<Track | null>(recording);
    const decided = useRef(false);
    const show = asShowRecording(arrivedWith);
    const needsList = show !== null && show.showId !== pickedShow();

    useEffect(() => {
        if (decided.current || (needsList && status !== 'ready')) {
            return;
        }
        decided.current = true;
        const stillLoaded = recording?.url === arrivedWith?.url;
        if (arrivedWith === null || (show && stillLoaded && !keepsShow(show, recordings))) {
            stop();
        }
    }, [arrivedWith, show, needsList, status, recording, recordings, stop]);
};
