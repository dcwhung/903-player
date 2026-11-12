/* 編輯頁路徑（列表、待辦共用） */

/** 短篇編輯位置：短篇 tab，hash 自動展開嗰個短篇（useHashTarget） */
export const arcEditorPath = (dramaId: string, arcId: string): string =>
    `/dramas/${dramaId}/arcs#${arcId}`;
