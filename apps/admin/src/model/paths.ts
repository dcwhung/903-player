/* 編輯頁路徑（列表、待辦共用）。ID 一律 encodeURIComponent（S-828）：而家 ID pattern 已經限制字元，防將來改規則 */

/** 劇編輯頁 */
export const dramaEditorPath = (dramaId: string): string =>
    `/dramas/${encodeURIComponent(dramaId)}`;

/** 短篇編輯位置：短篇 tab，hash 自動展開嗰個短篇（useHashTarget 會 decode） */
export const arcEditorPath = (dramaId: string, arcId: string): string =>
    `${dramaEditorPath(dramaId)}/arcs#${encodeURIComponent(arcId)}`;
