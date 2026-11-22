/*
 * 改咗劇集 ID 之後同一頁嘅新 URL（S-857 / AU-013）：path 換新 ID；記住嘅短篇（#<短篇 ID>）同
 * 由待辦入嚟嘅 ?todo=<key>（S-1395）入面嘅劇 ID / 自動編號短篇 ID 跟住改，flow bar 先對得返新 ID 嗰行
 */
import { renamedArcId } from '@903-player/catalog';
import type { TodoRow } from '../../api/types';
import { renamedDramaPath } from '../../model/paths';
import { todoKey } from '../update/todoModel';

const TODO_PARAM = 'todo';

/** #<短篇 ID>：自動編號嘅跟劇 ID 改；其他 hash（#folder / #images / 自訂短篇 ID）原樣 */
const renamedHash = (hash: string, from: string, to: string): string =>
    hash === ''
        ? ''
        : `#${encodeURIComponent(renamedArcId(decodeURIComponent(hash.slice(1)), from, to))}`;

/** 改名之後同一行待辦嘅 key（用 todoKey 砌返，唔拆字串） */
const renamedTodoKey = (row: TodoRow, from: string, to: string): string =>
    todoKey({
        kind: row.kind,
        dramaId: to,
        arcId: row.arcId === null ? null : renamedArcId(row.arcId, from, to),
    });

/** ?todo= 指住呢套劇嘅待辦行 → 換做改名後嗰行嘅 key；唔係（冇 todo / 第二套劇 / 搵唔到）就原樣 */
const renamedSearch = (
    search: string,
    rows: readonly TodoRow[],
    from: string,
    to: string,
): string => {
    const params = new URLSearchParams(search);
    const key = params.get(TODO_PARAM);
    const row = rows.find((r) => r.dramaId === from && todoKey(r) === key);
    if (!row) return search;
    params.set(TODO_PARAM, renamedTodoKey(row, from, to));
    return `?${params.toString()}`;
};

export const renamedDramaUrl = (
    location: { pathname: string; search: string; hash: string },
    rows: readonly TodoRow[],
    from: string,
    to: string,
): string =>
    `${renamedDramaPath(location.pathname, from, to)}${renamedSearch(location.search, rows, from, to)}${renamedHash(location.hash, from, to)}`;
