/*
 * 處理待辦頁「已修改」section：同確認發佈頁一樣嘅「修改」卡（節目 / 劇 / 短篇 + 欄位 chip，
 * EntryCardView），淨係顯示：修改一定一併發佈（冇勾選、唔改 PublishSelection），亦唔出還原。
 * 冇修改就成個 section 唔出
 */
import type { ChangesResponse, LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import { pendingEdits } from './pendingModel';
import { EntryCardView } from './TimelineCards';
import { entryCardsOf } from './timelineEntries';

interface EditsSectionProps {
    changes: ChangesResponse | undefined;
    entries: readonly LoadedEntry[];
}

export function EditsSection({ changes, entries }: EditsSectionProps) {
    const cards = entryCardsOf(pendingEdits(changes));
    if (cards.length === 0) return null;
    return (
        <section className="card" aria-labelledby="todo-edits-title">
            <h2 className="sec-title" id="todo-edits-title">
                {t('update.editsTitle')} <span className="hint">{t('update.editsHint')}</span>
            </h2>
            <ul className="tl-entries">
                {cards.map((card) => (
                    <EntryCardView key={card.key} card={card} entries={entries} />
                ))}
            </ul>
        </section>
    );
}
