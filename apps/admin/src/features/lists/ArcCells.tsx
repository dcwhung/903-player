/*
 * 廣播劇列表右邊：每個短篇一行（名 / 集數 / 狀態），同表頭對齊；> 4 個收埋已上架嗰啲，原位展開；
 * 短篇名係 link → 短篇 tab 展開嗰個短篇
 * Design Origin: mockup: _mockups_/admin/index.html#s2（.arcs）
 */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { hkToday } from '@903-player/catalog';
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import type { ChangeFlags } from '../../model/listModel';
import { arcEditorPath } from '../../model/paths';
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
            // 冇 id 嘅短篇（舊資料）冇得直接跳
            href: str(arc, 'id') === undefined ? undefined : arcEditorPath(entry.id, id),
            label: arcLabel(arc),
            episodes: countOf(arc),
            status: arcStatusOf(entry.definition, arc, today, isNew),
            isNew,
            disc: arcDiscOf(entry.definition, entry.images, arc),
        };
    });
};

function Line({ line }: { line: ArcLine }) {
    const name = (
        <>
            <Thumb url={line.disc} size="xs" />
            {line.isNew && <Pill tone="new">{t('status.newArc')}</Pill>}
            {line.label}
        </>
    );
    return (
        <>
            {/* 撳短篇名（連碟面）去短篇 tab 展開佢；link 喺 rowClick 嘅 INTERACTIVE，唔會觸發成行 */}
            {line.href ? (
                <Link className="arc arc-with-disc arc-link" to={line.href}>
                    {name}
                </Link>
            ) : (
                <span className="arc arc-with-disc">{name}</span>
            )}
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
                        {expanded ? (
                            <ChevronUp aria-hidden="true" />
                        ) : (
                            <ChevronDown aria-hidden="true" />
                        )}
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
