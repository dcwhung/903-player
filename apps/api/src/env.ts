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
}
