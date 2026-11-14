/*
 * 上線時間線（B v2）：Design Origin: mockup: _mockups_/admin-publish-summary/index.html
 * 按幾時上線分組（即時上線 = 綠點、日子 = accent 點），組內每套劇 / 節目一張卡；
 * App 外觀 / Banner 排即時上線組最頂；未完成項目排最尾「不會在本次發佈」（收起時都照出）。
 * 太長就收起，「至 M/D，查看全部」原位展開
 */
import { ChevronDown } from 'lucide-react';
import type { ChangeTimelineGroup } from '@903-player/catalog';
import { useState } from 'react';
import type { LoadedEntry, TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import type { AppearanceItem } from './selectionModel';
import { SkipGroup } from './SkipGroup';
import { AppearanceCard, EntryCardView } from './TimelineCards';
import { entryCardsOf, groupHeading } from './timelineEntries';
import { whenLabel } from './timelineModel';

const COLLAPSED_GROUPS = 6;
const NOW = 'now';

interface TimelineProps {
    groups: readonly ChangeTimelineGroup[];
    entries: readonly LoadedEntry[];
    /** 今次發佈嘅 App 外觀（冇 = 唔出 App 外觀卡） */
    appearance?: readonly AppearanceItem[];
    /** 不會在本次發佈嘅未完成行（冇 = 唔出嗰組） */
    skipped?: readonly TodoRow[];
}

/** 有 App 外觀但冇即時上線嘅內容：補一個空嘅即時上線組放 App 外觀卡 */
const withNowGroup = (
    groups: readonly ChangeTimelineGroup[],
    appearance: readonly AppearanceItem[],
): readonly ChangeTimelineGroup[] =>
    appearance.length > 0 && groups[0]?.when !== NOW
        ? [{ when: NOW, items: [] }, ...groups]
        : groups;

function TimelineGroup({
    group,
    entries,
    appearance,
}: Omit<TimelineProps, 'groups' | 'skipped'> & { group: ChangeTimelineGroup }) {
    const now = group.when === NOW;
    const heading = groupHeading(group.when);
    return (
        <li className={now ? 'now' : 'later'}>
            <p className="when">
                {heading.label}
                <span className="muted small">{heading.sub}</span>
            </p>
            <ul className="tl-entries">
                {now && appearance?.map((item) => <AppearanceCard key={item} item={item} />)}
                {entryCardsOf(group.items).map((card) => (
                    <EntryCardView key={card.key} card={card} entries={entries} />
                ))}
            </ul>
        </li>
    );
}

export function Timeline({
    groups: content,
    entries,
    appearance = [],
    skipped = [],
}: TimelineProps) {
    const [expanded, setExpanded] = useState(false);
    const groups = withNowGroup(content, appearance);
    const shown = expanded ? groups : groups.slice(0, COLLAPSED_GROUPS);
    const last = groups.at(-1);
    return (
        <ol className="timeline">
            {shown.map((group) => (
                <TimelineGroup
                    key={group.when}
                    group={group}
                    entries={entries}
                    appearance={appearance}
                />
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
            <SkipGroup rows={skipped} entries={entries} />
        </ol>
    );
}
