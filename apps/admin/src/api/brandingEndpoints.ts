/*
 * App 外觀（api 0.9.0）：App 圖示 / 名稱與簡介（草稿，發佈先上線）+ 發佈後重新部署 player 嘅狀態；
 * api 0.13.0：App 圖示原圖（PUT /api/assets/source）+ branding.icon.source（重新裁切用）
 */
import { request } from './client';
import type {
    BrandingIcon,
    BrandingResponse,
    BrandingText,
    DeployRequest,
    DeployStatus,
} from './types';

const deployPath = (id: number) => `/api/publishes/${id}/deploy`;

export const getBranding = async () => (await request<BrandingResponse>('/api/branding')).data;

/** App 圖示原圖原封不動上載（PNG / JPEG / WebP，≤ 20 MB）→ 圖檔名 */
export const uploadIconSource = async (file: Blob) =>
    (
        await request<{ name: string }>('/api/assets/source', {
            method: 'PUT',
            raw: file,
            contentType: file.type,
        })
    ).data;

/** 五張 PNG 檔名 + 遮罩底色（+ 原圖 + 裁切框）一齊換 */
export const putBrandingIcon = async (icon: BrandingIcon) =>
    (await request<BrandingResponse>('/api/branding/icon', { method: 'PUT', body: icon })).data;

/** 還原內建圖示（冇自訂都 204） */
export const deleteBrandingIcon = () => request('/api/branding/icon', { method: 'DELETE' });

/** shortName null = 唔設（用 App 名） */
export const putBrandingText = async (text: BrandingText) =>
    (await request<BrandingResponse>('/api/branding/text', { method: 'PUT', body: text })).data;

export const deleteBrandingText = () => request('/api/branding/text', { method: 'DELETE' });

export const getDeployStatus = async (id: number) =>
    (await request<DeployStatus>(deployPath(id))).data;

/** 重新部署（再觸發 GitHub + Vercel）；publish 本身失敗 → 409 */
export const redeploy = async (id: number) =>
    (
        await request<{ deploy: DeployRequest; deployRequestedAt: string | null }>(deployPath(id), {
            method: 'POST',
        })
    ).data;
