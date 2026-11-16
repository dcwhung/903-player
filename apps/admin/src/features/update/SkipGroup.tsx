/*
 * 時間線最尾「不會在本次發佈」：Design Origin: mockup: _mockups_/admin-publish-summary/index.html
 * 灰點、虛線框、灰階碟面；每行「[未完成] 短篇碟面 短篇名 原因」。冇未完成項目就唔出
 */
import type { LoadedEntry, TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import { todoDiscOf } from '../../model/thumbs';
import { Thumb } from '../../ui/Thumb';
import { skipCardsOf, type SkipCard, type SkipRow } from './skipModel';

interface WithEntries {
    entries: readonly LoadedEntry[];
}

function SkipRowView({ row, entries }: { row: SkipRow } & WithEntries) {
    return (
        <li className="tl-row">
            <span className="tl-tag skip">{t('publish.skipTag')}</span>
            {row.arcId === null ? (
                <span className="muted">{t('publish.levelDrama')}</span>
            ) : (
                <>
                    <Thumb url={todoDiscOf(entries, row.dramaId, row.arcId)} size="sm" />
                    <span className="tl-arc">{row.arcName}</span>
                </>
            )}
            {row.reason && <span className="muted small">{row.reason}</span>}
        </li>
    );
}

function SkipCardView({ card, entries }: { card: SkipCard } & WithEntries) {
    return (
        <li className="tl-entry skipped">
            <div className="tl-entry-head">
                <Thumb url={todoDiscOf(entries, card.dramaId, null)} />
                <span className="tl-entry-title">{card.name}</span>
            </div>
            <ul className="tl-rows">
                {card.rows.map((row) => (
                    <SkipRowView key={row.key} row={row} entries={entries} />
                ))}
            </ul>
        </li>
    );
}

export function SkipGroup({ rows, entries }: { rows: readonly TodoRow[] } & WithEntries) {
    if (rows.length === 0) return null;
    return (
        <li className="skip">
            <p className="when">
                {t('publish.skipTitle')}
                <span className="muted small">{t('publish.skipSub')}</span>
            </p>
            <ul className="tl-entries">
                {skipCardsOf(rows).map((card) => (
                    <SkipCardView key={card.dramaId} card={card} entries={entries} />
                ))}
            </ul>
        </li>
    );
}
