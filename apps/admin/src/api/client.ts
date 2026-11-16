/*
 * Admin API fetch wrapper：同 origin cookie、ETag / If-Match 樂觀鎖、HTTP 錯誤 → 型別化 error，
 * UI 按型別顯示（401 → login、412 → 重新載入、422 → 欄位錯誤、409 publish → 擋住清單）
 */

const HTTP = {
    noContent: 204,
    unauthorized: 401,
    conflict: 409,
    preconditionFailed: 412,
    unprocessable: 422,
} as const;

type Json = Record<string, unknown>;

export class ApiError extends Error {
    override readonly name: string = 'ApiError';

    constructor(
        readonly status: number,
        message: string,
        readonly body: Json = {},
    ) {
        super(message);
    }
}

/** 冇 session / 唔係 admin → login 畫面 */
export class UnauthorizedError extends ApiError {
    override readonly name = 'UnauthorizedError';
}

/** 412：其他視窗 / 裝置改咗（ETag 對唔到） */
export class VersionConflictError extends ApiError {
    override readonly name = 'VersionConflictError';
}

/** 422：驗證唔過；details = server 嘅欄位描述 */
export class ValidationError extends ApiError {
    override readonly name = 'ValidationError';

    get details(): string {
        return typeof this.body.details === 'string' ? this.body.details : this.message;
    }
}

/** 409 publish 被 ID 守衛擋住：missing = 會消失嘅 episode ID */
export class PublishBlockedError extends ApiError {
    override readonly name = 'PublishBlockedError';

    get missing(): string[] {
        return Array.isArray(this.body.missing) ? this.body.missing.map(String) : [];
    }
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    /** 原始 bytes（圖片上載） */
    raw?: Blob;
    contentType?: string;
    ifMatch?: string | null;
    /** 新增：If-None-Match: * */
    create?: boolean;
}

export interface ApiResult<T> {
    data: T;
    etag: string | null;
}

const headersOf = (options: RequestOptions): Headers => {
    const headers = new Headers({ accept: 'application/json' });
    if (options.body !== undefined) headers.set('content-type', 'application/json');
    if (options.raw && options.contentType) headers.set('content-type', options.contentType);
    if (options.ifMatch) headers.set('if-match', options.ifMatch);
    if (options.create) headers.set('if-none-match', '*');
    return headers;
};

export const readJson = async (response: Response): Promise<Json> => {
    try {
        const value: unknown = await response.json();
        return typeof value === 'object' && value !== null ? (value as Json) : {};
    } catch {
        return {};
    }
};

export const errorOf = (status: number, body: Json): ApiError => {
    const message = typeof body.error === 'string' ? body.error : `HTTP ${status}`;
    if (status === HTTP.unauthorized) return new UnauthorizedError(status, message, body);
    if (status === HTTP.preconditionFailed) return new VersionConflictError(status, message, body);
    if (status === HTTP.unprocessable) return new ValidationError(status, message, body);
    if (status === HTTP.conflict && Array.isArray(body.missing))
        return new PublishBlockedError(status, message, body);
    return new ApiError(status, message, body);
};

export const request = async <T = Json>(
    path: string,
    options: RequestOptions = {},
): Promise<ApiResult<T>> => {
    const response = await fetch(path, {
        method: options.method ?? 'GET',
        credentials: 'same-origin',
        headers: headersOf(options),
        body:
            options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });
    if (!response.ok) throw errorOf(response.status, await readJson(response));
    const etag = response.headers.get('etag');
    if (response.status === HTTP.noContent) return { data: null as T, etag };
    return { data: (await readJson(response)) as T, etag };
};
