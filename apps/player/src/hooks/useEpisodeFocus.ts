import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EpisodeFocusState } from '../types/showPageState';
import { zoomFromState, zoomState } from '../utils/cardZoom';

/**
 * 由 location.state 攞 focusId（收藏 tab 撳行入嚟先有）。
 * 升級前開住嘅頁帶嘅舊 focusUrl 唔認：最多唔捲去嗰集（S-743）
 */
export const focusIdFromState = (state: unknown): string | undefined => {
    const id: unknown = (state as Partial<Record<keyof EpisodeFocusState, unknown>> | null)
        ?.focusId;
    return typeof id === 'string' ? id : undefined;
};

/**
 * 集數清單嘅 focusKey：清單行 key 係網址（EpisodeList），所以由 focusId 搵返嗰集嘅網址；
 * 唔理播緊乜都照捲（同 focused 唔同）
 */
export const focusKeyOf = (
    episodes: readonly { id: string; url: string }[],
    focusId: string | undefined,
): string | undefined =>
    focusId === undefined ? undefined : episodes.find((e) => e.id === focusId)?.url;

/**
 * 由「我的收藏」撳行入嚟嗰集（P7 #7）：入頁嗰下讀一次就定（成個頁面期間都記住，用嚟唔自動播、
 * 捲去嗰集），之後即刻由 history state 清走（返上一頁再入、refresh 唔會再觸發）；
 * zoom 來源要留低，返主頁先縮得返入嗰行（同 useShowPage 清 url 一樣）
 */
export const useEpisodeFocus = (): string | undefined => {
    const location = useLocation();
    const navigate = useNavigate();
    const [focusId] = useState(() => focusIdFromState(location.state));
    const pending = focusIdFromState(location.state) !== undefined;
    const zoomFrom = zoomFromState(location.state);
    const { pathname } = location;
    useEffect(() => {
        if (!pending) return;
        void navigate(pathname, {
            replace: true,
            state: zoomFrom === null ? null : zoomState(zoomFrom),
        });
    }, [pending, navigate, pathname, zoomFrom]);
    return focusId;
};
