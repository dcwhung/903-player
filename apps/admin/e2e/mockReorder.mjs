// Admin e2e 假 API：排序改動（api 0.12.0，#6）—— 確認發佈頁 reorder item（每個列表一個、冇 entry）、
// POST /api/order/:kind/revert（成個列表還原；冇發佈版本 409 notPublished）、發佈記錄有 reorder 嘅一行

const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export const reorderItem = (list) => ({ kind: 'reorder', when: 'now', detail: { list } });

/** createState({ reorder: true })：節目拖曳過（未發佈）；還原後冇咗 */
export const reorderState = () => ({ reordered: ['shows'], orderReverts: [] });

/** state.others 頂：reorder item（同 catalog summarizeChanges 一樣排 now 組最頂） */
export const reorderItems = (state) => (state.reordered ?? []).map(reorderItem);

/** 之前一次發佈（#4）：廣播劇排序改咗（上下架記錄出「廣播劇排序已更改」） */
export const reorderHistoryRow = (row) => ({
    ...row,
    current: false,
    createdAt: '2026-11-11T08:30:00.000Z',
    changes: { items: [reorderItem('dramas')], timeline: [] },
});

/** POST /api/order/:kind/revert：記低 state.orderReverts；updated = 還原咗幾多個 entry */
export const orderRevertRoute = (state, route, kind) => {
    if (state.publishes.length === 0 && state.history.length === 0)
        return json(route, { error: 'nothing has been published', reason: 'notPublished' }, 409);
    state.orderReverts.push(kind);
    const updated = state.entries.filter((entry) => entry.kind === kind).length;
    state.reordered = (state.reordered ?? []).filter((list) => list !== kind);
    return json(route, { updated });
};
