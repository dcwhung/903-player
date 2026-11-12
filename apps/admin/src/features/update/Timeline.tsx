/*
 * 上架時間線（幾時 → 類型 tag → 縮圖 + 名 → 第幾集）：Design Origin: mockup: _mockups_/admin/index.html#u3
 * 太長就收起，「至 M/D，查看全部」原位展開
 */
import { ChevronDown } from 'lucide-react';
import type { ChangeItem, ChangeTimelineGroup } from '@903-player/catalog';
import { Fragment, useState } from 'react';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import { episodeTotalOf, thumbOf } from '../../model/thumbs';
import { Thumb } from '../../ui/Thumb';
import { itemName, itemRange, kindLabel, whenLabel } from './timelineModel';

const COLLAPSED_GROUPS = 6;

function TimelineItem({ item, entries }: { item: ChangeItem; entries: readonly LoadedEntry[] }) {
    const range =
        item.kind === 'newDrama'
            ? t('publish.all', { count: episodeTotalOf(entries, item) })
            : itemRange(item);
    return (
        <span className="what">
            <span className="kind">{kindLabel(item.kind)}</span>
            <Thumb url={thumbOf(entries, item)} size="sm" />
            {itemName(item)}
            {range && <span className="muted">{range}</span>}
        </span>
    );
}

export function Timeline({
    groups,
    entries,
}: {
    groups: readonly ChangeTimelineGroup[];
    entries: readonly LoadedEntry[];
}) {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? groups : groups.slice(0, COLLAPSED_GROUPS);
    const last = groups.at(-1);
    return (
        <ol className="timeline">
            {shown.map((group) => (
                <li key={group.when} className={group.when === 'now' ? 'now' : undefined}>
                    <span className="when">{whenLabel(group.when)}</span>
                    {group.items.map((item, i) => (
                        <Fragment
                            key={`${item.kind}-${item.entry?.id ?? ''}-${item.arc?.id ?? ''}-${i}`}
                        >
                            {i > 0 && <span />}
                            <TimelineItem item={item} entries={entries} />
                        </Fragment>
                    ))}
                </li>
            ))}
            {!expanded && last && groups.length > COLLAPSED_GROUPS && (
                <li className="more">
                    <span className="when">…</span>
                    <button type="button" className="link-btn" onClick={() => setExpanded(true)}>
                        {t('publish.showAll', { date: whenLabel(last.when) })}
                        <ChevronDown aria-hidden="true" />
                    </button>
                </li>
            )}
        </ol>
    );
}
