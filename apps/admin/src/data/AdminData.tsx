/*
 * Admin 共用資料：自動掃描狀態、待辦（nav 數字 + 矩陣 + flow bar）、全部 entry（列表 + 縮圖）、未發佈變更。
 * 掃描完先讀其他嘢（掃描會寫 D1）
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { getEntry, getTodos, listEntries } from '../api/endpoints';
import { getChanges } from '../api/publishEndpoints';
import type { ChangesResponse, LoadedEntry, TodosResponse } from '../api/types';
import { useResource, type Resource } from './useResource';
import { useScan, type ScanState } from './useScan';

export interface AdminData {
    scan: ScanState;
    rescan: () => Promise<void>;
    todos: Resource<TodosResponse>;
    entries: Resource<LoadedEntry[]>;
    changes: Resource<ChangesResponse>;
    /** 儲存 / 發佈之後：待辦、entry、變更全部重讀 */
    refresh: () => Promise<void>;
}

export const AdminDataContext = createContext<AdminData | null>(null);

/** 列表嘅 published / publishedArcs（成個列表一次計）併入每個 entry */
export const loadAllEntries = async (): Promise<LoadedEntry[]> =>
    Promise.all(
        (await listEntries()).map(async (e) => ({
            ...(await getEntry(e.kind, e.id)),
            published: e.published,
            publishedArcs: e.publishedArcs,
        })),
    );

export function AdminDataProvider({ children }: { children: ReactNode }) {
    const todos = useResource(getTodos, false);
    const entries = useResource(loadAllEntries, false);
    const changes = useResource(() => getChanges(), false);
    const { reload: reloadTodos } = todos;
    const { reload: reloadEntries } = entries;
    const { reload: reloadChanges } = changes;
    const refresh = useCallback(async () => {
        await Promise.all([reloadTodos(), reloadEntries(), reloadChanges()]);
    }, [reloadTodos, reloadEntries, reloadChanges]);
    const { state: scan, scan: rescan } = useScan(() => void refresh());
    const value = useMemo(
        () => ({ scan, rescan, todos, entries, changes, refresh }),
        [scan, rescan, todos, entries, changes, refresh],
    );
    return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export const useAdminData = (): AdminData => {
    const value = useContext(AdminDataContext);
    if (!value) throw new Error('useAdminData must be used inside AdminDataProvider');
    return value;
};
