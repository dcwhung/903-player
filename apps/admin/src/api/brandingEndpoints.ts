/* App 外觀（api 0.9.0）：App 圖示 / 名稱與簡介（草稿，發佈先上線）+ 發佈後重新部署 player 嘅狀態 */
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

/** 五張 PNG 檔名 + 遮罩底色一齊換 */
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
