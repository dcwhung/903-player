import { useEffect, useState } from 'react';
import { TODAY_INFO_SEEN_STORAGE_KEY } from '../../config/constants';

const SEEN = '1';

/** 私人瀏覽 / 封鎖咗 storage 讀唔到就當未睇過（最多每次都展開，唔影響使用） */
const readSeen = (): boolean => {
    try {
        return localStorage.getItem(TODAY_INFO_SEEN_STORAGE_KEY) !== null;
    } catch {
        return false;
    }
};

const writeSeen = (): void => {
    try {
        localStorage.setItem(TODAY_INFO_SEEN_STORAGE_KEY, SEEN);
    } catch {
        // 記唔低就下次再展開一次
    }
};

/**
 * 今日節目頁「節目表」資料展開咗未（P9.5 #12）：第一次入（有資料嗰次）展開，記低睇過，之後入頁預設收合。
 * 未有資料（例如錄音未載完）唔算睇過
 */
export const useTodayInfoExpanded = (hasInfo: boolean) => {
    const [seenOnEntry] = useState(readSeen);
    const [choice, setChoice] = useState<boolean | null>(null);
    useEffect(() => {
        if (hasInfo && !seenOnEntry) writeSeen();
    }, [hasInfo, seenOnEntry]);
    const expanded = choice ?? !seenOnEntry;
    return { expanded, toggle: () => setChoice(!expanded) };
};
