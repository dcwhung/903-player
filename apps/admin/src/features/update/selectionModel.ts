/*
 * 選擇發佈（mockup: _mockups_/admin-selective-publish/index.html，Q1–Q4）：
 * 更新頁記住「剔走咗」嘅項目（唔係「勾咗」），新出現嘅 selectable 行 / App 外觀改動自動預設勾選（Q1）；
 * 確認發佈頁用 URL ?selection= 帶住今次選擇，reload 照用；冇就 fallback 預設選擇
 */
import type { ChangeItem } from '@903-player/catalog';
import type { Appearance, PublishSelection, TodoRow } from '../../api/types';
import { isRecord } from '../../model/raw';

/** App 外觀項目（更新頁 section 嘅次序 = App 外觀頁卡次序） */
export const APPEARANCE_ITEMS = ['icon', 'text', 'banner'] as const;
export type AppearanceItem = (typeof APPEARANCE_ITEMS)[number];

export interface Unpicked {
    content: ReadonlySet<string>;
    appearance: ReadonlySet<AppearanceItem>;
}

export const EMPTY_UNPICKED: Unpicked = { content: new Set(), appearance: new Set() };

export const SELECTION_PARAM = 'selection';

export const changedAppearance = (appearance: Appearance | undefined): AppearanceItem[] =>
    APPEARANCE_ITEMS.filter((item) => appearance?.[item] === true);

export const selectionOf = (
    rows: readonly TodoRow[],
    appearance: Appearance | undefined,
    unpicked: Unpicked,
): PublishSelection => {
    const picked = new Set(
        changedAppearance(appearance).filter((item) => !unpicked.appearance.has(item)),
    );
    return {
        content: rows
            .filter((row) => row.publish === 'selectable' && !unpicked.content.has(row.key))
            .map((row) => row.key),
        branding: { icon: picked.has('icon'), text: picked.has('text') },
        banner: picked.has('banner'),
    };
};

export const pickedAppearance = (selection: PublishSelection): AppearanceItem[] =>
    APPEARANCE_ITEMS.filter((item) =>
        item === 'banner' ? selection.banner : selection.branding[item],
    );

/** 「已選擇 N 項發佈」：新內容 + App 外觀 */
export const pickedCount = (selection: PublishSelection): number =>
    selection.content.length + pickedAppearance(selection).length;

export const incompleteRows = (rows: readonly TodoRow[]): TodoRow[] =>
    rows.filter((row) => row.publish === 'incomplete');

/** Q4：一項都冇揀、又冇其他改動 →「下一步」灰 */
export const hasAnythingToPublish = (
    selection: PublishSelection,
    others: readonly ChangeItem[],
): boolean => pickedCount(selection) > 0 || others.length > 0;

export const encodeSelection = (selection: PublishSelection): string =>
    new URLSearchParams({ [SELECTION_PARAM]: JSON.stringify(selection) }).toString();

const isSelection = (value: unknown): value is PublishSelection =>
    isRecord(value) &&
    Array.isArray(value.content) &&
    value.content.every((key) => typeof key === 'string') &&
    isRecord(value.branding) &&
    typeof value.branding.icon === 'boolean' &&
    typeof value.branding.text === 'boolean' &&
    typeof value.banner === 'boolean';

/** URL 嘅 selection（手改 / 壞咗 = undefined → 用預設選擇） */
export const decodeSelection = (params: URLSearchParams): PublishSelection | undefined => {
    const raw = params.get(SELECTION_PARAM);
    if (raw === null) return undefined;
    try {
        const value: unknown = JSON.parse(raw);
        return isSelection(value) ? value : undefined;
    } catch {
        return undefined;
    }
};
