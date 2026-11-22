// Admin e2e 假 API：改劇集 ID（AU-013）—— POST /api/entries/dramas/:id/rename 同 apps/api 一樣連自動編號嘅
// 短篇 ID（<舊 ID>-NN）同排程一齊改；之後嘅 PUT 少咗有排程嘅短篇 ID 就 409 arcScheduled（apps/api droppedScheduledArc）

const json = (route, body, { status = 200, etag } = {}) =>
    route.fulfill({
        status,
        contentType: 'application/json',
        headers: etag ? { etag } : {},
        body: JSON.stringify(body),
    });

export const SCANNED_ID = 'drama-01';
const AUTO_ARC_ID = `${SCANNED_ID}-01`;

/** createState({ rename: true })：掃描建嘅新劇（從未發佈），第一輯係自動編號 ID 兼有排程，特別篇係自訂 ID */
export const scannedDrama = () => ({
    kind: 'dramas',
    id: SCANNED_ID,
    definition: {
        name: '新掃描劇集',
        kind: 'series',
        enabled: false,
        order: 9,
        addedAt: '2026-11-12',
        arcs: [
            { id: AUTO_ARC_ID, name: '第一輯', episodes: 5, enabled: false },
            { id: 'special', name: '特別篇', episodes: 1, enabled: false },
        ],
    },
    images: {},
    draft: true,
    updatedAt: `${SCANNED_ID}-v1`,
});

export const renameSchedules = () => ({
    [`${SCANNED_ID}/${AUTO_ARC_ID}`]: {
        kind: 'dates',
        batches: [{ from: 1, date: '2026-12-01' }],
    },
});

/** renames = 收到嘅改 ID 要求；failPuts = 之後幾多個 PUT 回 422（試「rename 成功、PUT 失敗」） */
export const renameState = () => ({ rename: true, renames: [], failPuts: 0 });

/** 同 packages/catalog renamedArcId 一樣：<from>-NN → <to>-NN，其他唔郁 */
const renamedArcId = (arcId, from, to) =>
    arcId.startsWith(from) && /^-\d{2}$/.test(arcId.slice(from.length))
        ? `${to}${arcId.slice(from.length)}`
        : arcId;

const moveSchedules = (state, from, to) => {
    state.schedules = Object.fromEntries(
        Object.entries(state.schedules).map(([key, rule]) => {
            const [dramaId, arcId] = key.split('/');
            return dramaId === from
                ? [`${to}/${renamedArcId(arcId, from, to)}`, rule]
                : [key, rule];
        }),
    );
};

export const renameRoute = (state, route, request, id) => {
    const entry = state.entries.find((e) => e.kind === 'dramas' && e.id === id);
    if (!entry) return json(route, { error: 'no such entry' }, { status: 404 });
    if (request.headers()['if-match'] !== `"${entry.updatedAt}"`)
        return json(route, { error: 'entry changed' }, { status: 412 });
    const { newId } = request.postDataJSON();
    if (state.entries.some((e) => e.kind === 'dramas' && e.id === newId))
        return json(route, { error: `drama ${newId} already exists` }, { status: 409 });
    entry.id = newId;
    entry.definition.arcs = entry.definition.arcs.map((arc) => ({
        ...arc,
        id: renamedArcId(arc.id, id, newId),
    }));
    entry.updatedAt = `${newId}-renamed`;
    moveSchedules(state, id, newId);
    state.renames.push({ from: id, to: newId });
    return json(route, { id: newId, updatedAt: entry.updatedAt }, { etag: `"${entry.updatedAt}"` });
};

const droppedScheduledArc = (state, entry, body) => {
    const next = new Set((body.definition.arcs ?? []).map((arc) => arc.id));
    return (entry.definition.arcs ?? [])
        .map((arc) => arc.id)
        .find((arcId) => !next.has(arcId) && `${entry.id}/${arcId}` in state.schedules);
};

/** PUT 之前：要拒絕就 fulfil 兼回 true（state.rename 先用，唔影響其他 section） */
export const refusePut = (state, route, entry, body) => {
    if (!state.rename) return false;
    const arcId = droppedScheduledArc(state, entry, body);
    if (arcId !== undefined) {
        const error = `arc ${arcId} has a schedule; delete it before changing the arc id`;
        void json(route, { error, arcId, reason: 'arcScheduled' }, { status: 409 });
        return true;
    }
    if (state.failPuts > 0) {
        state.failPuts -= 1;
        void json(route, { error: 'invalid entry', details: 'e2e: forced' }, { status: 422 });
        return true;
    }
    return false;
};
