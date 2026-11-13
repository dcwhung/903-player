/* 編輯頁路徑（列表、待辦共用）。ID 一律 encodeURIComponent（S-828）：而家 ID pattern 已經限制字元，防將來改規則 */

/** 節目編輯頁 */
export const showEditorPath = (showId: string): string => `/shows/${encodeURIComponent(showId)}`;

/** 劇編輯頁 */
export const dramaEditorPath = (dramaId: string): string =>
    `/dramas/${encodeURIComponent(dramaId)}`;

/** 短篇編輯位置：短篇 tab，hash 自動展開嗰個短篇（useHashTarget 會 decode） */
export const arcEditorPath = (dramaId: string, arcId: string): string =>
    `${dramaEditorPath(dramaId)}/arcs#${encodeURIComponent(arcId)}`;

const DRAMAS_PREFIX = '/dramas/';

/** URL 段落 decode；唔合法嘅 %xx 就當對唔上 */
const decodeSegment = (segment: string): string | null => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return null;
    }
};

/**
 * 改 ID 之後：同一個 tab 換新 ID（S-857）。pathname 係 encode 咗嘅，所以 decode 劇嗰段先同 `from` 比較；
 * 唔係呢套劇嘅路徑就原樣奉還
 */
export const renamedDramaPath = (pathname: string, from: string, to: string): string => {
    if (!pathname.startsWith(DRAMAS_PREFIX)) return pathname;
    const rest = pathname.slice(DRAMAS_PREFIX.length);
    const slash = rest.indexOf('/');
    const segment = slash < 0 ? rest : rest.slice(0, slash);
    const tail = slash < 0 ? '' : rest.slice(slash);
    return decodeSegment(segment) === from ? `${dramaEditorPath(to)}${tail}` : pathname;
};
