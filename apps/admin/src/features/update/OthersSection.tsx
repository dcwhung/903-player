/*
 * 處理待辦頁「其他改動」section：其他已儲存改動（修改、下架、排序……，即 GET /api/changes others）全部列出，
 * 用同確認發佈頁一樣嘅卡（ChangeCard）。淨係顯示：一定一併發佈（冇勾選、唔改 PublishSelection），亦唔出還原。
 * 冇其他改動就成個 section 唔出
 */
import type { ChangesResponse, LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import { ChangeCard } from './ChangeCard';
import { pendingOthers } from './pendingModel';
import { entryCardsOf } from './timelineEntries';

interface OthersSectionProps {
    changes: ChangesResponse | undefined;
    entries: readonly LoadedEntry[];
}

export function OthersSection({ changes, entries }: OthersSectionProps) {
    const cards = entryCardsOf(pendingOthers(changes));
    if (cards.length === 0) return null;
    return (
        <section className="card" aria-labelledby="todo-others-title">
            <h2 className="sec-title" id="todo-others-title">
                {t('update.othersTitle')} <span className="hint">{t('update.othersHint')}</span>
            </h2>
            <ul className="tl-entries">
                {cards.map((card) => (
                    <ChangeCard key={card.key} card={card} entries={entries} />
                ))}
            </ul>
        </section>
    );
}
