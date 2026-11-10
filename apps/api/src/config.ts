/* apps/api 嘅 named constants：cookie、TTL、cache 秒數、R2 key layout、Google endpoint */

/** 唯一一份（S-773） */
export const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const DAY_SECONDS = 24 * 60 * MINUTE_SECONDS;
const SESSION_DAYS = 30;
const OAUTH_STATE_MINUTES = 10;
const YEAR_DAYS = 365;

/** admin session：cookie 名一定要 __Host-（Secure、Path=/、冇 Domain） */
export const SESSION_COOKIE = '__Host-session';
export const SESSION_TTL_SECONDS = SESSION_DAYS * DAY_SECONDS;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * SECOND_MS;
/** session token 隨機 bytes（D1 只存 SHA-256） */
export const SESSION_TOKEN_BYTES = 32;

/** OAuth 開始 → callback 之間嘅 state + PKCE verifier（HMAC 簽名、短命） */
export const OAUTH_COOKIE = '__Host-oauth';
export const OAUTH_STATE_TTL_SECONDS = OAUTH_STATE_MINUTES * MINUTE_SECONDS;
export const OAUTH_STATE_BYTES = 16;
/** RFC 7636：verifier 43–128 字；32 bytes base64url = 43 字 */
export const PKCE_VERIFIER_BYTES = 32;

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_ISSUERS: readonly string[] = [
    'https://accounts.google.com',
    'accounts.google.com',
];
export const GOOGLE_SCOPE = 'openid email';
export const OAUTH_CALLBACK_PATH = '/auth/google/callback';

/** R2 layout：catalog.json 同圖喺同一個 folder（player SW 圖 CacheFirst route 靠呢點 match，S-763） */
export const CATALOG_JSON_PATH = '/catalog/v1/catalog.json';
export const CATALOG_IMAGE_PATH = '/catalog/v1/img/';
/** R2 object key = URL path 去咗開頭 / */
export const CATALOG_JSON_KEY = CATALOG_JSON_PATH.slice(1);
export const CATALOG_IMAGE_KEY_PREFIX = CATALOG_IMAGE_PATH.slice(1);

/** catalog.json：短 cache（publish 後最多 60 秒生效），靠 ETag revalidate */
export const CATALOG_JSON_MAX_AGE_SECONDS = MINUTE_SECONDS;
/** 圖檔名 = content hash，永遠唔變 */
export const IMAGE_MAX_AGE_SECONDS = YEAR_DAYS * DAY_SECONDS;
/** 圖檔名：<sha256 前 16 hex>.<ext>（同 scripts/importLibrary.mjs 一致） */
export const IMAGE_FILE_PATTERN = /^[0-9a-f]{16}\.(webp|jpg)$/;

/**
 * Publish 驗證用嘅 host: app 錄音 base：worker 只驗結構同計 episode ID（ID 唔包 URL），
 * player 自己用 BASE_URL 砌真 URL
 */
export const VALIDATION_APP_AUDIO_BASE = 'https://app-audio.invalid/dramas/';

export const HTTP_STATUS = {
    ok: 200,
    noContent: 204,
    found: 302,
    notModified: 304,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    conflict: 409,
    unprocessable: 422,
    badGateway: 502,
} as const;
