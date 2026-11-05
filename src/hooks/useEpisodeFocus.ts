import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../player/usePlayer';
import type { EpisodeFocusState } from '../types/showPageState';
import type { Track } from '../types/track';
import { zoomFromState, zoomState } from '../utils/cardZoom';
import { useAudioBusy } from './useAudioBusy';

/** 由 location.state 攞 focusUrl（收藏 tab 撳行入嚟先有） */
export const focusUrlFromState = (state: unknown): string | undefined => {
    const url: unknown = (state as Partial<Record<keyof EpisodeFocusState, unknown>> | null)
        ?.focusUrl;
    return typeof url === 'string' ? url : undefined;
};

/**
 * 由「我的收藏」撳行入嚟嗰集（P7 #7）：入頁嗰下讀一次就定（成個頁面期間都記住，用嚟唔自動播、
 * 捲去嗰集），之後即刻由 history state 清走（返上一頁再入、refresh 唔會再觸發）；
 * zoom 來源要留低，返主頁先縮得返入嗰行（同 useShowPage 清 url 一樣）
 */
export const useEpisodeFocus = (): string | undefined => {
    const location = useLocation();
    const navigate = useNavigate();
    const [focusUrl] = useState(() => focusUrlFromState(location.state));
    const pending = focusUrlFromState(location.state) !== undefined;
    const zoomFrom = zoomFromState(location.state);
    const { pathname } = location;
    useEffect(() => {
        if (!pending) return;
        void navigate(pathname, {
            replace: true,
            state: zoomFrom === null ? null : zoomState(zoomFrom),
        });
    }, [pending, navigate, pathname, zoomFrom]);
    return focusUrl;
};

/**
 * 由「我的收藏」入嚟、冇其他嘢佔住（useAudioBusy）：載入嗰集但唔播，唱片、時間、揀中行即刻跟嗰集，
 * 撳播放就播佢（原本會自動播嘅情況改做淨係載入）。有其他嘢播緊 / 暫停緊就唔郁，唔蓋過。
 * 嗰集未出（例如錄音清單仲載緊）就等；成個頁面期間只做一次
 */
export const useCueFocused = (track: Track | undefined) => {
    const busy = useAudioBusy();
    const { load } = usePlayer();
    const cued = useRef(false);
    useEffect(() => {
        if (cued.current || !track) return;
        cued.current = true;
        if (!busy) void load(track);
    }, [track, busy, load]);
};
