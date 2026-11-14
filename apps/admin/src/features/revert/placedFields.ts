/*
 * 每個編輯頁原位還原咗嘅欄位（其他改咗嘅就喺表格最尾「其他已修改：…」一行還原）。
 * name = 標題旁、theme = 配色 tab、enabled / removedAt = 狀態欄（編輯頁冇下架日期欄位）
 */
const SHARED = ['name', 'theme', 'enabled', 'removedAt', 'tile', 'disc', 'summary'];

export const SHOW_PLACED: readonly string[] = [...SHARED, 'airDays', 'airTime', 'hosts'];

/** 劇集基本資料：arcs 喺短篇 tab 逐個還原 */
export const DRAMA_PLACED: readonly string[] = [...SHARED, 'kind', 'addedAt', 'arcs'];

export const ARC_PLACED: readonly string[] = [
    'displayName',
    'enabled',
    'removedAt',
    'tile',
    'disc',
    'summary',
    'cast',
];

export const NAME_FIELDS: readonly string[] = ['name'];
export const THEME_FIELDS: readonly string[] = ['theme'];
