/*
 * 列表圖例要顯示咩（3c production 回饋）：淨係列表入面真係有嘅先出——
 * 圓點顏色（綠 / 藍 / 紅 / 灰）、「待發佈」（有已儲存未發佈改動、而唔係從未發佈）、「新」（從未發佈嘅短篇）
 */
import { hkToday } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import type { ChangeFlags } from '../../model/listModel';
import { arcsOf, str } from '../../model/raw';
import { entryDotOf, type Dot } from '../../model/status';

const DOT_ORDER: readonly Dot[] = ['live', 'soon', 'off', 'unlisted'];

export interface Legend {
    dots: Dot[];
    pending: boolean;
    newArcs: boolean;
}

export const legendOf = (
    entries: readonly LoadedEntry[],
    flags: ChangeFlags,
    today: string = hkToday(),
): Legend => {
    const present = new Set(
        entries.map((e) => entryDotOf(e.kind, e.definition, e.draft, today, e.published)),
    );
    const keyOf = (e: LoadedEntry) => `${e.kind}:${e.id}`;
    return {
        dots: DOT_ORDER.filter((dot) => present.has(dot)),
        pending: entries.some(
            (e) => flags.pending.has(keyOf(e)) && !flags.never.has(keyOf(e)) && !e.draft,
        ),
        newArcs: entries.some((e) =>
            arcsOf(e.definition).some((arc) => flags.newArcs.has(`${e.id}:${str(arc, 'id')}`)),
        ),
    };
};
