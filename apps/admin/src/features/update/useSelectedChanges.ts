/*
 * 確認發佈頁：今次選擇（URL ?selection=，reload 照用；冇 / 壞咗 = 更新頁而家嘅選擇，reload 後即預設選擇）
 * + 照選擇計嘅 GET /api/changes?selection=（422 未知 key = stale：頁面過時）
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getChanges, isStaleSelection } from '../../api/publishEndpoints';
import type { ChangesResponse, PublishSelection } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { usePublishSelection } from './PublishSelection';
import { decodeSelection, selectionOf } from './selectionModel';

export const usePublishTarget = (): PublishSelection | undefined => {
    const [params] = useSearchParams();
    const { todos, changes } = useAdminData();
    const { unpicked } = usePublishSelection();
    const fromUrl = decodeSelection(params);
    if (fromUrl) return fromUrl;
    if (!todos.data || !changes.data) return undefined;
    return selectionOf(todos.data.rows, changes.data.appearance, unpicked);
};

export interface SelectedChanges {
    data: ChangesResponse | undefined;
    error: Error | undefined;
    stale: boolean;
    loading: boolean;
}

interface Loaded {
    /** 呢份結果屬於邊個選擇（JSON） */
    key: string | undefined;
    data?: ChangesResponse;
    error?: Error;
}

const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

/** revision 變 = 同一個選擇都重讀（例如還原咗未發佈改動） */
export const useSelectedChanges = (
    selection: PublishSelection | undefined,
    revision = 0,
): SelectedChanges => {
    const [loaded, setLoaded] = useState<Loaded>({ key: undefined });
    // JSON 做 key：選擇內容一樣就唔重讀（selection object 每次 render 都係新嘅）
    const json = selection ? JSON.stringify(selection) : undefined;
    const key = json === undefined ? undefined : `${revision}:${json}`;
    useEffect(() => {
        if (key === undefined || json === undefined) return undefined;
        let live = true;
        getChanges(JSON.parse(json) as PublishSelection).then(
            (data) => live && setLoaded({ key, data }),
            (error: unknown) => live && setLoaded({ key, error: asError(error) }),
        );
        return () => {
            live = false;
        };
    }, [key, json]);
    // 讀緊新選擇：舊結果照顯示（同 useResource 一樣），loading 擋住「發佈」
    return {
        data: loaded.data,
        error: loaded.error,
        stale: isStaleSelection(loaded.error),
        loading: key === undefined || loaded.key !== key,
    };
};
