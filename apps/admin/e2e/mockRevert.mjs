// Admin e2e 假 API：還原未發佈改動（api 0.11.0）—— GET entry 嘅 published、POST …/revert、
// 同發佈版本唔同嘅欄位 → 確認發佈頁「修改」行（同 catalog summarizeChanges 一樣分劇本身 / 每個短篇）

const IMAGE_SLOTS = ['tile', 'disc'];
/** 頂層唔逐個比 / 唔還原：arcs（逐個短篇）、order（列表次序） */
const SKIPPED_TOP = new Set(['arcs', 'order']);

const clone = (value) => structuredClone(value);

/*
 * createState({ revert: true })（要連 realImages）：蘭茜夫人劇場已發佈版本嘅簡介 / 碟面、
 * 戀愛二分一嘅簡介 / 橫圖同 D1 唔同；我心不死、戀愛後二分一從未發佈
 */
const LANCY_SUMMARY = {
    now: '蘭茜夫人的懸疑廣播劇，逢星期一至五晚播出。',
    then: '蘭茜夫人的廣播劇。',
};
export const HALF_SUMMARY = { now: '一段關於愛情與成長的短篇故事。', then: '一段關於愛情的短篇。' };

export const withPublished = (entry) => {
    if (entry.id !== 'lancy') return entry;
    const half = (summary) => ({ ...entry.definition.arcs[0], summary });
    const definition = {
        ...entry.definition,
        summary: LANCY_SUMMARY.now,
        arcs: [half(HALF_SUMMARY.now), ...entry.definition.arcs.slice(1)],
    };
    const publishedVersion = {
        definition: {
            ...clone(definition),
            summary: LANCY_SUMMARY.then,
            arcs: [half(HALF_SUMMARY.then)],
        },
        images: {
            ...entry.images,
            'disc.webp': 'waves-disc.webp',
            'arcs/half/tile.webp': 'waves-tile.webp',
        },
    };
    return { ...entry, definition, publishedVersion };
};

const fileOf = (target, slot, arcId) =>
    target[slot] ?? (arcId === undefined ? `${slot}.webp` : `arcs/${arcId}/${slot}.webp`);

const changedKeys = (now, then, images, arcId) => {
    const keys = new Set([...IMAGE_SLOTS, ...Object.keys(now), ...Object.keys(then)]);
    return [...keys].filter((key) => {
        if (arcId === undefined && SKIPPED_TOP.has(key)) return false;
        if (JSON.stringify(now[key]) !== JSON.stringify(then[key])) return true;
        if (!IMAGE_SLOTS.includes(key)) return false;
        return images.now[fileOf(now, key, arcId)] !== images.then[fileOf(then, key, arcId)];
    });
};

const editItem = (ref, fields, arc) => ({
    kind: 'edit',
    when: 'now',
    entry: ref,
    ...(arc ? { arc: { id: arc.id, name: arc.name, label: arc.displayName ?? arc.name } } : {}),
    detail: { fields },
});

/** state.others（mockSelection changesFor）：每個有發佈版本嘅 entry 嘅「修改」 */
export const revertItems = (state) =>
    state.entries
        .filter((entry) => entry.publishedVersion)
        .flatMap((entry) => {
            const { definition, publishedVersion: then } = entry;
            const images = { now: entry.images, then: then.images };
            const ref = { kind: entry.kind, id: entry.id, name: definition.name };
            const top = changedKeys(definition, then.definition, images);
            const arcs = (definition.arcs ?? []).flatMap((arc) => {
                const old = (then.definition.arcs ?? []).find((a) => a.id === arc.id);
                const fields = old ? changedKeys(arc, old, images, arc.id) : [];
                return fields.length > 0 ? [editItem(ref, fields, arc)] : [];
            });
            return [...(top.length > 0 ? [editItem(ref, top)] : []), ...arcs];
        });

const copyKey = (target, source, key) => {
    if (key in source) target[key] = clone(source[key]);
    else delete target[key];
};

const applyItem = (entry, { arc, field }) => {
    const then = entry.publishedVersion;
    const target = arc ? entry.definition.arcs.find((a) => a.id === arc) : entry.definition;
    const source = arc ? then.definition.arcs.find((a) => a.id === arc) : then.definition;
    copyKey(target, source, field);
    if (IMAGE_SLOTS.includes(field)) copyKey(entry.images, then.images, fileOf(source, field, arc));
};

const json = (route, body, { status = 200, etag } = {}) =>
    route.fulfill({
        status,
        contentType: 'application/json',
        headers: etag ? { etag } : {},
        body: JSON.stringify(body),
    });

/** POST /api/entries/:kind/:id/revert：If-Match 必須；冇發佈版本 409；記低 state.reverts */
export const revertRoute = (state, route, request, [kind, id]) => {
    const entry = state.entries.find((e) => e.kind === kind && e.id === id);
    if (!entry) return json(route, { error: 'no such entry' }, { status: 404 });
    const ifMatch = request.headers()['if-match'];
    if (ifMatch !== `"${entry.updatedAt}"`)
        return json(route, { error: 'entry changed' }, { status: 412 });
    if (!entry.publishedVersion)
        return json(
            route,
            { error: 'no published version', reason: 'notPublished' },
            { status: 409 },
        );
    const body = request.postDataJSON();
    entry.definition = clone(entry.definition);
    entry.images = clone(entry.images);
    body.items.forEach((item) => applyItem(entry, item));
    state.reverts.push({ kind, id, body, ifMatch });
    entry.updatedAt = `${id}-r${state.reverts.length}`;
    return json(
        route,
        { updatedAt: entry.updatedAt, draft: false, warnings: { missingEpisodeIds: [] } },
        { etag: `"${entry.updatedAt}"` },
    );
};
