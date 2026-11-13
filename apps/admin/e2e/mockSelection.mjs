// Admin e2e 假 API：選擇發佈（api 0.10.0）—— 待辦行 key / publish、GET /api/changes appearance / others /
// ?selection=、POST /api/publish { selection }（同 apps/api catalog/selection.ts 一樣規則嘅簡化版）

const cell = (state, target) => (target ? { state, target } : { state });

/*
 * createState({ selective: true })（mockup admin-selective-publish ①）：
 * 戀愛後二分一（設定完成 → selectable）+ 大衛營（未設定排期 → incomplete），名稱與簡介有改
 */
const selectiveRows = () => [
    {
        key: 'newArc/lancy/love-after',
        publish: 'selectable',
        kind: 'newArc',
        findingIds: [11],
        dramaId: 'lancy',
        arcId: 'love-after',
        name: '蘭茜夫人劇場 · 戀愛後二分一',
        cells: {
            folder: cell('done', '/dramas/lancy#folder'),
            id: cell('done', '/dramas/lancy/arcs#love-after'),
            images: cell('done', '/dramas/lancy/arcs#love-after'),
            schedule: cell('done', '/dramas/lancy/schedule#love-after'),
            summary: cell('done', '/dramas/lancy/arcs#love-after'),
        },
    },
    {
        key: 'newArc/sammy/camp',
        publish: 'incomplete',
        kind: 'newArc',
        findingIds: [12],
        dramaId: 'sammy',
        arcId: 'camp',
        name: '森美小儀系列 · 大衛營',
        cells: {
            folder: cell('done', '/dramas/sammy#folder'),
            id: cell('done', '/dramas/sammy/arcs#camp'),
            images: cell('done', '/dramas/sammy/arcs#camp'),
            schedule: cell('must', '/dramas/sammy/schedule#camp'),
            summary: cell('optional', '/dramas/sammy/arcs#camp'),
        },
    },
];

const arcItem = (entry, arc, episodes) => ({
    kind: 'newArc',
    when: 'now',
    entry: { kind: 'dramas', ...entry },
    arc: { ...arc, label: arc.name },
    detail: { episodes: { first: 1, last: episodes } },
});

const SELECTIVE_ITEMS = {
    'newArc/lancy/love-after': arcItem(
        { id: 'lancy', name: '蘭茜夫人劇場' },
        { id: 'love-after', name: '戀愛後二分一' },
        20,
    ),
    'newArc/sammy/camp': arcItem(
        { id: 'sammy', name: '森美小儀系列' },
        { id: 'camp', name: '大衛營' },
        8,
    ),
};

export const selectiveTodos = (state) =>
    state.publishes.length > 0 ? { rows: [], blocking: 0 } : { rows: selectiveRows(), blocking: 1 };

/** 每行新內容 → 變更摘要 item（selective 用固定表；預設 state 由 mockApi 傳入 lancy-02 嗰個） */
const contentItems = (state, rows, defaultItems) =>
    state.selective
        ? rows.map((row) => ({ key: row.key, item: SELECTIVE_ITEMS[row.key] }))
        : defaultItems.map((item) => ({ key: `newArc/lancy/${item.arc.id}`, item }));

export const appearanceOf = (state) => ({
    icon: state.branding.icon !== null,
    text: state.branding.text !== null,
    banner: state.banner !== null,
});

const summary = (items) => ({ items, timeline: items.length ? [{ when: 'now', items }] : [] });

/** selection → 今次發佈嘅 key / skipped / 未知 key（同 api planSelection） */
const planOf = (rows, selection) => {
    const keys = new Set(rows.map((row) => row.key));
    const picked = new Set(selection.content ?? []);
    return {
        content: rows
            .filter((r) => r.publish === 'selectable' && picked.has(r.key))
            .map((r) => r.key),
        skipped: rows
            .filter((r) => r.publish === 'incomplete' && picked.has(r.key))
            .map((r) => ({ key: r.key, reason: 'incomplete' })),
        unknown: [...picked].filter((key) => !keys.has(key)),
    };
};

/**
 * GET /api/changes（selection = undefined：全部）/ POST /api/publish 共用：
 * { status: 422, body } 或者 { body }（changes 跟 selection、appearance / others 唔跟）
 */
export const changesFor = (state, { rows, defaultItems, selection }) => {
    const content = contentItems(state, rows, defaultItems);
    const others = state.others ?? [];
    const appearance = appearanceOf(state);
    if (!selection) {
        const items = [...content.map((c) => c.item), ...others];
        return {
            body: {
                changes: summary(items),
                bannerChanged: appearance.banner,
                brandingChanged: appearance.icon || appearance.text,
                appearance,
                others: summary(others),
            },
        };
    }
    const plan = planOf(rows, selection);
    if (plan.unknown.length > 0)
        return { status: 422, body: { error: 'unknown selection keys', keys: plan.unknown } };
    const items = [
        ...content.filter((c) => plan.content.includes(c.key)).map((c) => c.item),
        ...others,
    ];
    const branding = selection.branding ?? {};
    const bannerChanged = appearance.banner && selection.banner === true;
    const brandingChanged =
        (appearance.icon && branding.icon === true) || (appearance.text && branding.text === true);
    return {
        body: {
            changes: summary(items),
            bannerChanged,
            brandingChanged,
            unchanged: items.length === 0 && !bannerChanged && !brandingChanged,
            appearance,
            others: summary(others),
            selection: { content: plan.content, skipped: plan.skipped },
        },
    };
};

/** GET /api/changes?selection=<URL-encoded JSON> */
export const selectionFromUrl = (url) => {
    const raw = url.searchParams.get('selection');
    return raw === null ? undefined : JSON.parse(raw);
};
