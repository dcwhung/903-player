// Admin e2e 嘅假 API（page.route）：in-memory 狀態，夠行 login → 掃描 → 待辦 → 設 ID → 發佈 → 記錄、拖曳排序
const json = (route, body, { status = 200, etag } = {}) =>
    route.fulfill({
        status,
        contentType: 'application/json',
        headers: etag ? { etag } : {},
        body: JSON.stringify(body),
    });

const show = (id, name, order) => ({
    kind: 'shows',
    id,
    definition: {
        name,
        fileTime: '1500',
        airDays: [1, 2, 3, 4, 5],
        tile: 'tile.webp',
        disc: 'disc.webp',
        theme: {},
        order,
    },
    images: {},
    draft: false,
    updatedAt: `${id}-v1`,
});

const lancy = () => ({
    kind: 'dramas',
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        kind: 'series',
        enabled: true,
        order: 1,
        addedAt: '2026-10-27',
        audio: { host: 'r2', folder: '蘭茜夫人劇場', file: '{no2} - {arc}.m4a' },
        arcs: [
            { id: 'half', name: '戀愛二分一', episodes: 30 },
            { id: 'arc-01', name: '我心不死', episodes: 37, addedAt: '2026-11-01' },
        ],
    },
    images: {},
    draft: false,
    updatedAt: 'lancy-v1',
});

const golden = () => ({
    kind: 'dramas',
    id: 'golden',
    definition: {
        name: '黃金少年',
        kind: 'series',
        enabled: true,
        order: 2,
        addedAt: '2026-10-01',
        arcs: [{ id: 's1', name: 'Season 1', episodes: 35 }],
    },
    images: {},
    draft: false,
    updatedAt: 'golden-v1',
});

const NA = { state: 'na' };

export const createState = () => ({
    loggedIn: false,
    entries: [show('waves', '口水多過浪花', 1), lancy(), golden()],
    publishes: [],
    orders: [],
    puts: [],
});

/** 新短篇 arc-01：ID 未改就係必須 */
const todosOf = (state) => {
    const drama = state.entries.find((e) => e.id === 'lancy');
    const arc = drama.definition.arcs[1];
    const placeholder = /^arc-\d+$/.test(arc.id);
    if (state.publishes.length > 0) return { rows: [], blocking: 0 };
    const target = `/dramas/lancy/arcs#${arc.id}`;
    const row = {
        kind: 'newArc',
        findingIds: [1],
        dramaId: 'lancy',
        arcId: arc.id,
        name: `蘭茜夫人劇場 · ${arc.name}`,
        cells: {
            folder: NA,
            id: { state: placeholder ? 'must' : 'done', target },
            images: { state: 'optional', target },
            schedule: { state: 'done', target: `/dramas/lancy/schedule#${arc.id}` },
            summary: { state: 'optional', target },
        },
    };
    return { rows: [row], blocking: placeholder ? 1 : 0 };
};

const changesOf = (state) => {
    if (state.publishes.length > 0) return { items: [], timeline: [] };
    const item = {
        kind: 'newArc',
        when: 'now',
        entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
        arc: { id: 'heart', name: '我心不死', label: '我心不死' },
        detail: { episodes: { first: 1, last: 37 } },
    };
    return { items: [item], timeline: [{ when: 'now', items: [item] }] };
};

const publishRow = (id) => ({
    id,
    createdAt: new Date().toISOString(),
    createdBy: 'admin@example.com',
    hash: 'abc',
    showCount: 1,
    dramaCount: 2,
    episodeCount: 102,
    rollbackOf: null,
    status: 'ok',
    error: null,
    current: true,
    changes: changesOf({ publishes: [] }),
});

const entryRoute = (state, route, request, [kind, id]) => {
    const entry = state.entries.find((e) => e.kind === kind && e.id === id);
    if (!entry) return json(route, { error: 'no such entry' }, { status: 404 });
    if (request.method() === 'GET')
        return json(
            route,
            {
                definition: entry.definition,
                images: entry.images,
                draft: entry.draft,
                updatedAt: entry.updatedAt,
            },
            { etag: `"${entry.updatedAt}"` },
        );
    if (request.headers()['if-match'] !== `"${entry.updatedAt}"`)
        return json(route, { error: 'entry changed' }, { status: 412 });
    const body = request.postDataJSON();
    Object.assign(entry, body, { updatedAt: `${id}-v${state.puts.length + 2}` });
    state.puts.push({ kind, id, body });
    return json(
        route,
        { updatedAt: entry.updatedAt, draft: false, warnings: { missingEpisodeIds: [] } },
        { etag: `"${entry.updatedAt}"` },
    );
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 同 packages/catalog expandSchedule 一樣形狀（{ addedAt, episodeDates, episodeRemovedAt }）嘅簡化展開 */
const expandRule = (rule, count, firstNo = 1) => {
    if (rule.kind === 'dates') {
        const [first, ...rest] = rule.batches;
        return {
            addedAt: first.date,
            episodeDates: Object.fromEntries(rest.map((b) => [b.from, b.date])),
            episodeRemovedAt: {},
        };
    }
    const fits = (ms) =>
        'weekdays' in rule.every ? rule.every.weekdays.includes(new Date(ms).getUTCDay()) : true;
    const step = 'days' in rule.every ? rule.every.days * DAY_MS : DAY_MS;
    let ms = Date.parse(`${rule.start}T00:00:00Z`);
    while (!fits(ms)) ms += DAY_MS;
    const dates = [];
    for (let no = firstNo; no < firstNo + count; no += rule.perRelease) {
        dates.push([no, isoOf(ms)]);
        do ms += step;
        while (!fits(ms));
    }
    const [[, addedAt], ...later] = dates;
    return { addedAt, episodeDates: Object.fromEntries(later), episodeRemovedAt: {} };
};

const previewRoute = (state, route, request, [dramaId, arcId]) => {
    const drama = state.entries.find((e) => e.kind === 'dramas' && e.id === dramaId);
    const arc = drama?.definition.arcs.find((a) => a.id === arcId);
    if (!arc) return json(route, { error: 'no such arc' }, { status: 404 });
    const expanded = expandRule(request.postDataJSON().rule, arc.episodes, arc.firstNo ?? 1);
    return json(route, { expanded, warnings: { missingEpisodeIds: [] } });
};

const handlers = {
    'GET /api/me': (state, route) =>
        state.loggedIn
            ? json(route, { email: 'admin@example.com' })
            : json(route, { error: 'not logged in' }, { status: 401 }),
    'POST /api/scan': (state, route) =>
        json(route, { scannedAt: new Date().toISOString(), findings: [], skipped: [] }),
    'GET /api/todos': (state, route) => json(route, todosOf(state)),
    'GET /api/entries': (state, route) =>
        json(route, {
            entries: state.entries.map(({ kind, id, definition, draft, updatedAt }) => ({
                kind,
                id,
                name: definition.name,
                enabled: definition.enabled ?? true,
                draft,
                updatedAt,
            })),
        }),
    'GET /api/changes': (state, route) =>
        json(route, {
            base: null,
            changes: changesOf(state),
            validation: { ok: true, episodeCount: 102 },
        }),
    'POST /api/publish': (state, route) => {
        const row = publishRow(state.publishes.length + 1);
        state.publishes.unshift(row);
        return json(route, { publish: row });
    },
    'GET /api/publishes': (state, route) => json(route, { publishes: state.publishes }),
};

export const installMockApi = async (page, state) => {
    await page.route(/\/(api|auth)\//, (route, request) => {
        const url = new URL(request.url());
        const key = `${request.method()} ${url.pathname}`;
        const entry = url.pathname.match(/^\/api\/entries\/(shows|dramas)\/([^/]+)$/);
        if (entry) return entryRoute(state, route, request, entry.slice(1));
        if (/^PUT \/api\/order\//.test(key)) {
            state.orders.push({
                kind: url.pathname.split('/').pop(),
                ids: request.postDataJSON().ids,
            });
            return json(route, { ids: request.postDataJSON().ids, changed: [] });
        }
        const preview = url.pathname.match(
            /^\/api\/dramas\/([^/]+)\/arcs\/([^/]+)\/schedule\/preview$/,
        );
        if (preview) return previewRoute(state, route, request, preview.slice(1));
        if (/\/schedule$/.test(url.pathname))
            return json(route, { error: 'no such schedule' }, { status: 404 });
        const handler = handlers[key];
        return handler
            ? handler(state, route)
            : json(route, { error: `no mock for ${key}` }, { status: 404 });
    });
};
