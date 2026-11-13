/*
 * 確認發佈頁「本次發佈」：Design Origin: mockup: _mockups_/admin-selective-publish/index.html#b
 * 揀咗嘅新內容 + App 外觀 + 其他已儲存的改動（Q3，others.items）；未完成項目（不會在本次發佈）；
 * App 外觀（圖示 / 名稱與簡介）須重新部署提示
 */
import type { ChangeItem } from '@903-player/catalog';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import type { ChangesResponse, LoadedEntry, PublishSelection, TodoRow } from '../../api/types';
import { t, type MessageKey } from '../../i18n/t';
import { editFieldsText } from './changeFields';
import { itemName, kindLabel } from './timelineModel';
import { displayName, episodesOf, incompleteText } from './todoModel';
import { pickedAppearance, type AppearanceItem } from './selectionModel';

const APPEARANCE_LABEL: Record<AppearanceItem, MessageKey> = {
    icon: 'update.itemIcon',
    text: 'update.itemText',
    banner: 'update.itemBanner',
};

/** 「修改 · 劇名（配色、簡介）」：修改寫埋改了哪些欄位 */
const otherLabel = (item: ChangeItem, entries: readonly LoadedEntry[]): string => {
    const entry = item.entry?.name;
    const name = item.arc && entry ? `${entry} › ${itemName(item)}` : itemName(item);
    const fields = editFieldsText(item, entries);
    const label = `${kindLabel(item.kind)} · ${name}`;
    return fields ? t('publish.editedFields', { label, fields }) : label;
};

/** 「新短篇 · 劇名 › 短篇名（N 集）」；集數未知（entries 未載入）就唔加 */
const contentLabel = (row: TodoRow, entries: readonly LoadedEntry[]): string => {
    const kind = t(row.kind === 'newDrama' ? 'kind.newDrama' : 'kind.newArc');
    const name = displayName(row);
    const count = episodesOf(row, entries);
    return count === undefined
        ? t('publish.selectionContent', { kind, name })
        : t('publish.selectionContentEpisodes', { kind, name, count });
};

/** 未完成：待辦嘅 incomplete 行 + server 自動剔走嘅（揀咗之後先變未完成） */
const incompleteOf = (rows: readonly TodoRow[], data: ChangesResponse): TodoRow[] => {
    const skipped = new Set(data.selection?.skipped.map((s) => s.key));
    return rows.filter((row) => row.publish === 'incomplete' || skipped.has(row.key));
};

interface SelectionCardProps {
    data: ChangesResponse;
    selection: PublishSelection;
    rows: readonly TodoRow[];
    entries: readonly LoadedEntry[];
}

function PickedList({ data, selection, rows, entries }: SelectionCardProps) {
    const content = new Set(data.selection?.content ?? selection.content);
    const picked = rows.filter((row) => content.has(row.key));
    const appearance = pickedAppearance(selection).filter((item) => data.appearance?.[item]);
    const others = data.others?.items ?? [];
    if (picked.length + appearance.length + others.length === 0)
        return <p className="muted">{t('publish.selectionNone')}</p>;
    return (
        <ul className="plain">
            {picked.map((row) => (
                <li key={row.key}>{contentLabel(row, entries)}</li>
            ))}
            {appearance.map((item) => (
                <li key={item}>
                    {t('publish.selectionAppearance', { name: t(APPEARANCE_LABEL[item]) })}
                </li>
            ))}
            {others.length > 0 && (
                <li>
                    {t('publish.selectionOthers')}
                    <ul>
                        {others.map((item, i) => (
                            <li
                                key={`${item.kind}-${item.entry?.id ?? ''}-${item.arc?.id ?? ''}-${i}`}
                            >
                                {otherLabel(item, entries)}
                            </li>
                        ))}
                    </ul>
                </li>
            )}
        </ul>
    );
}

export function SelectionCard(props: SelectionCardProps) {
    const incomplete = incompleteOf(props.rows, props.data);
    return (
        <section className="card" aria-labelledby="publish-selection-title">
            <h2 className="sec-title" id="publish-selection-title">
                {t('publish.selectionTitle')}
            </h2>
            <PickedList {...props} />
            {incomplete.length > 0 && (
                <p className="note muted-note">
                    <TriangleAlert aria-hidden="true" />
                    {t('publish.incomplete', {
                        items: incomplete
                            .map((row) => incompleteText(displayName(row), row))
                            .join('；'),
                    })}
                </p>
            )}
            {props.data.brandingChanged && (
                <p className="note info" role="note">
                    <RefreshCw aria-hidden="true" />
                    {t('publish.deployNote')}
                </p>
            )}
        </section>
    );
}
