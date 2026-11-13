/* 每個 admin API endpoint 一個 function（形狀見 types.ts） */
import type { ScheduleRule } from '@903-player/catalog';
import { ApiError, errorOf, readJson, request } from './client';
import type {
    BannerImages,
    BannerResponse,
    DramaScanResponse,
    DramaSources,
    EntryDetail,
    EntryKind,
    EntrySummary,
    ImageMap,
    LoadedEntry,
    PublishSummary,
    RawDefinition,
    SaveResult,
    ScanResponse,
    ScheduleState,
    TodosResponse,
} from './types';

const NOT_FOUND = 404;

const entryPath = (kind: EntryKind, id: string) => `/api/entries/${kind}/${encodeURIComponent(id)}`;
const schedulePath = (dramaId: string, arcId: string) =>
    `/api/dramas/${encodeURIComponent(dramaId)}/arcs/${encodeURIComponent(arcId)}/schedule`;

export const getMe = async () => (await request<{ email: string }>('/api/me')).data;

export const logout = () => request('/auth/logout', { method: 'POST' });

export const scanAll = async () =>
    (await request<ScanResponse>('/api/scan', { method: 'POST' })).data;

export const getTodos = async () => (await request<TodosResponse>('/api/todos')).data;

export const listEntries = async () =>
    (await request<{ entries: EntrySummary[] }>('/api/entries')).data.entries;

export const getEntry = async (kind: EntryKind, id: string): Promise<LoadedEntry> => {
    const { data, etag } = await request<EntryDetail>(entryPath(kind, id));
    return { ...data, kind, id, etag };
};

export interface EntryWrite {
    definition: RawDefinition;
    images: ImageMap;
}

/** etag = null → 新增（If-None-Match: *） */
export const putEntry = async (
    kind: EntryKind,
    id: string,
    body: EntryWrite,
    etag: string | null,
) => {
    const options = etag === null ? { create: true } : { ifMatch: etag };
    return request<SaveResult>(entryPath(kind, id), { method: 'PUT', body, ...options });
};

export const deleteEntry = (kind: EntryKind, id: string, etag: string | null) =>
    request(entryPath(kind, id), { method: 'DELETE', ifMatch: etag });

export const renameDrama = (id: string, newId: string, etag: string | null) =>
    request<{ id: string; updatedAt: string }>(`${entryPath('dramas', id)}/rename`, {
        method: 'POST',
        body: { newId },
        ifMatch: etag,
    });

/** 確認掃描自動派嘅 ID（就算冇改）：待辦 ID 格變 ✓（3c） */
export const confirmId = (dramaId: string, arcId?: string) =>
    request<{ confirmed: number }>('/api/todos/confirm-id', {
        method: 'POST',
        body: arcId === undefined ? { dramaId } : { dramaId, arcId },
    });

export const pairFolder = (id: string, folder: string, etag: string | null) =>
    request(`/api/dramas/${encodeURIComponent(id)}/folder`, {
        method: 'POST',
        body: { folder },
        ifMatch: etag,
    });

export const unmappedFolders = async () =>
    (await request<{ folders: string[] }>('/api/folders/unmapped')).data.folders;

export const rescanDrama = async (id: string) =>
    (
        await request<DramaScanResponse>(`/api/dramas/${encodeURIComponent(id)}/scan`, {
            method: 'POST',
        })
    ).data;

export const putOrder = (kind: EntryKind, ids: string[]) =>
    request(`/api/order/${kind}`, { method: 'PUT', body: { ids } });

export const listPublishes = async () =>
    (await request<{ publishes: PublishSummary[] }>('/api/publishes')).data.publishes;

/** 還原 #id（3c：上架狀態寫返 D1、之後新增嘅下架，再發佈）；unchanged = 冇嘢要改 */
export const rollback = async (id: number) =>
    (await request<{ unchanged?: boolean }>(`/api/publishes/${id}/rollback`, { method: 'POST' }))
        .data;

/** 冇排程 → null */
export const getSchedule = async (dramaId: string, arcId: string) => {
    try {
        return (await request<ScheduleState>(schedulePath(dramaId, arcId))).data;
    } catch (error) {
        if (error instanceof ApiError && error.status === NOT_FOUND) return null;
        throw error;
    }
};

/**
 * 儲存排程；enable = 同一個 D1 batch 順手將短篇轉「上架」（S-803，新短篇預設下架，排咗期先上架）。
 * 回應同冇 enable 時一樣
 */
export const putSchedule = (
    dramaId: string,
    arcId: string,
    rule: ScheduleRule,
    etag: string | null,
    { enable = false }: { enable?: boolean } = {},
) =>
    request<{ updatedAt: string; warnings: SaveResult['warnings'] }>(schedulePath(dramaId, arcId), {
        method: 'PUT',
        body: enable ? { rule, enable } : { rule },
        ifMatch: etag,
    });

export const deleteSchedule = (dramaId: string, arcId: string) =>
    request(schedulePath(dramaId, arcId), { method: 'DELETE' });

/** 封面 / Banner = WebP；App 圖示 = PNG（api 0.9.0） */
export const uploadAsset = async (file: Blob, contentType = 'image/webp') =>
    (
        await request<{ name: string }>('/api/assets', {
            method: 'PUT',
            raw: file,
            contentType,
        })
    ).data;

/** 圖片 URL（Worker 代出 catalog 圖） */
export const imageUrl = (name: string) => `/catalog/v1/img/${encodeURIComponent(name)}`;

/** R2 資料夾嘅封面原圖（cd cover / cover photo）；audio.host 唔係 r2 → 422 */
export const getDramaSources = async (id: string) =>
    (await request<DramaSources>(`/api/dramas/${encodeURIComponent(id)}/sources`)).data;

/** R2 原圖 bytes（Content-Type 跟副檔名）；冇原圖 404、> 20 MB 413、唔係圖 415 */
export const fetchR2Source = async (key: string): Promise<Blob> => {
    const response = await fetch(`/api/r2-source?key=${encodeURIComponent(key)}`, {
        credentials: 'same-origin',
    });
    if (!response.ok) throw errorOf(response.status, await readJson(response));
    return response.blob();
};

export const getBanner = async () => (await request<BannerResponse>('/api/banner')).data;

/** 兩張一齊換（草稿，publish 先上線） */
export const putBanner = async (banner: BannerImages) =>
    (await request<BannerResponse>('/api/banner', { method: 'PUT', body: banner })).data;

/** 還原預設（冇 banner 都 204） */
export const deleteBanner = () => request('/api/banner', { method: 'DELETE' });
