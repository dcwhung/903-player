/*
 * 廣播劇列表右邊：每個短篇一行（名 / 集數 / 狀態），同表頭對齊；> 4 個收埋已上架嗰啲，原位展開
 * Design Origin: mockup: _mockups_/admin/index.html#s2（.arcs）
 */
import { hkToday } from '@903-player/catalog';
import { Fragment, useState } from 'react';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import type { ChangeFlags } from '../../model/listModel';
import { arcLabel, arcsOf, countOf, isDaily, str } from '../../model/raw';
import { arcStatusOf, dailyStatusOf } from '../../model/status';
import { arcDiscOf } from '../../model/thumbs';
import { Pill } from '../../ui/Pill';
import { Thumb } from '../../ui/Thumb';
import { collapseArcs, type ArcLine } from './arcLines';

const linesOf = (entry: LoadedEntry, flags: ChangeFlags): ArcLine[] => {
    const today = hkToday();
    return arcsOf(entry.definition).map((arc, i) => {
        const id = str(arc, 'id') ?? String(i);
        const isNew = flags.newArcs.has(`${entry.id}:${id}`);
        return {
            key: id,
            label: arcLabel(arc),
            episodes: countOf(arc),
            status: arcStatusOf(entry.definition, arc, today, isNew),
            isNew,
            disc: arcDiscOf(entry.definition, entry.images, arc),
        };
    });
};

function Line({ line }: { line: ArcLine }) {
    return (
        <>
            <span className="arc arc-with-disc">
                <Thumb url={line.disc} size="xs" />
                {line.isNew && <Pill tone="new">{t('status.newArc')}</Pill>}
                {line.label}
            </span>
            <span className="eps">{t('list.episodes', { count: line.episodes })}</span>
            <span>
                <Pill tone={line.status.tone} dot={line.status.tone !== 'none'}>
                    {line.status.text}
                </Pill>
            </span>
        </>
    );
}

function DailyLine({ entry }: { entry: LoadedEntry }) {
    const status = dailyStatusOf(entry.definition, hkToday());
    return (
        <>
            <span className="arc muted">{t('list.dailyNoArcs')}</span>
            <span className="eps">{t('list.episodes', { count: countOf(entry.definition) })}</span>
            <span>
                <Pill tone={status.tone} dot>
                    {status.text}
                </Pill>
            </span>
        </>
    );
}

export function ArcCells({ entry, flags }: { entry: LoadedEntry; flags: ChangeFlags }) {
    const [expanded, setExpanded] = useState(false);
    if (isDaily(entry.definition))
        return (
            <div className="arcs">
                <DailyLine entry={entry} />
            </div>
        );
    const lines = linesOf(entry, flags);
    if (lines.length === 0)
        return (
            <div className="arcs">
                <span className="arc muted">{t('list.noArcs')}</span>
            </div>
        );
    const { shown, hidden } = expanded ? { shown: lines, hidden: 0 } : collapseArcs(lines);
    const collapsible = hidden > 0 || expanded;
    return (
        <div className="arcs">
            {shown.map((line) => (
                <Fragment key={line.key}>
                    <Line line={line} />
                </Fragment>
            ))}
            {collapsible && (
                <>
                    <button
                        type="button"
                        className="more link-btn"
                        aria-expanded={expanded}
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? t('list.collapse') : t('list.expand', { count: lines.length })}
                    </button>
                    <span className="eps" />
                    <span className="muted small">
                        {expanded ? '' : t('list.restLive', { count: hidden })}
                    </span>
                </>
            )}
        </div>
    );
}
