import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../player/usePlayer';

/**
 * 返到主頁時決定繼續播定停：入嚟嗰刻有嘢載入緊就繼續播，mini player 一定會顯示佢——
 * 今日節目照常、廣播劇顯示嗰套劇、其他節目錄音（例如節目頁揀嘅舊集）排喺清單最前做「重溫」
 * （見 miniPlayerRecordings）。冇嘢載入先停（存進度）。每次入嚟只決定一次
 */
export const useHomeArrival = (): void => {
    const { recording, stop } = usePlayer();
    const [arrivedWith] = useState(recording);
    const decided = useRef(false);

    useEffect(() => {
        if (decided.current) {
            return;
        }
        decided.current = true;
        if (arrivedWith === null) {
            stop();
        }
    }, [arrivedWith, stop]);
};
