/*
 * 時間線 / 處理待辦頁「其他改動」共用：排序改動 = ReorderCard（成個列表一張卡），其他 = EntryCardView（劇 / 節目卡）
 */
import type { LoadedEntry } from '../../api/types';
import { ReorderCard } from './ReorderCard';
import { EntryCardView } from './TimelineCards';
import type { EntryCard } from './timelineEntries';

interface ChangeCardProps {
    card: EntryCard;
    entries: readonly LoadedEntry[];
    /** 有 = 出「還原」；還原完 caller 重讀 */
    onReverted?: (() => Promise<unknown>) | undefined;
}

export function ChangeCard({ card, entries, onReverted }: ChangeCardProps) {
    const first = card.items[0];
    return first?.kind === 'reorder' ? (
        <ReorderCard item={first} onReverted={onReverted} />
    ) : (
        <EntryCardView card={card} entries={entries} onReverted={onReverted} />
    );
}
