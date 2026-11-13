/* Worker bindings（wrangler.toml）+ vars + secrets */
export interface Env {
    DB: D1Database;
    CATALOG: R2Bucket;
    /** 廣播劇音檔（903-radio-drama）：只 list / head，同 get 封面原圖（r2-source） */
    AUDIO: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    /** secret */
    GOOGLE_CLIENT_SECRET: string;
    /** secret：state cookie 嘅 HMAC key */
    SESSION_SECRET: string;
    /** 逗號分隔 */
    ADMIN_EMAILS: string;
    /** 逗號分隔：CORS 只回呢度 match 到嘅 origin */
    PLAYER_ORIGINS: string;
    /** Worker 自己嘅 origin：OAuth redirect、CSRF Origin 檢查、catalog 圖 URL */
    WORKER_ORIGIN: string;
    /**
     * 選填 secret：GitHub fine-grained token（只限 dcwhung/903-player，Contents: Read and write（dispatch 要）、Actions: Read（查 run））；
     * publish 改咗 branding 就 repository_dispatch 重新部署 GitHub Pages + 查部署狀態。冇 = 唔觸發（deploy: skipped）
     */
    GITHUB_DEPLOY_TOKEN?: string;
    /** 選填 secret：Vercel Deploy Hook URL（branch main）；冇 = 唔觸發 Vercel */
    VERCEL_DEPLOY_HOOK_URL?: string;
}
