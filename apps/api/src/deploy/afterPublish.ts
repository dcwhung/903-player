/*
 * Publish 之後：branding 有改（同上一次 ok publish 比）先觸發重新部署 player（player build 時先讀 branding）。
 * 結果記入 publishes.deploy / deploy_requested_at；記唔到只 log，唔令 publish 失敗（R2 已經寫咗）
 */
import { publishedBranding, sameBranding } from '../branding/document';
import { setPublishDeploy, type PublishRow } from '../catalog/store';
import { triggerDeploy, type DeploySecrets } from './trigger';

export type DeployEnv = DeploySecrets & { DB: D1Database };

/** 觸發 + 記錄；回更新咗 deploy 欄位嘅 row（POST /api/publishes/:id/deploy 都用） */
export const requestDeploy = async (env: DeployEnv, publish: PublishRow): Promise<PublishRow> => {
    // 先記時間後觸發：查 GitHub run 用 created >= 呢個時間，唔會漏咗今次嗰個 run
    const requestedAt = new Date().toISOString();
    const deploy = await triggerDeploy(env, publish.id);
    try {
        await setPublishDeploy(env.DB, publish.id, { deploy, requestedAt });
    } catch (error) {
        console.error(`publish ${publish.id}: could not record deploy ${deploy}`, error);
    }
    return { ...publish, deploy, deploy_requested_at: requestedAt };
};

/** before = 上一次 ok publish 嘅 catalog.json（冇 = 第一次）；after = 今次 */
export const deployAfterPublish = async (
    env: DeployEnv,
    publish: PublishRow,
    { before, after }: { before: string | undefined; after: string },
): Promise<PublishRow> =>
    sameBranding(publishedBranding(before), publishedBranding(after))
        ? publish
        : requestDeploy(env, publish);
