/* 排程分頁頂：每個短篇一粒 tab（名 + 細字而家排程）（mockup ⑩ .arc-tabs） */
import { hkToday } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { arcLabel } from '../../model/raw';
import { Pill } from '../../ui/Pill';
import { arcTabNote } from './stripModel';
import type { ScheduleMap } from './useSchedules';

interface ArcScheduleTabsProps {
    drama: RawDefinition;
    arcs: { arc: RawDefinition; id: string }[];
    selected: string;
    schedules: ScheduleMap;
    isNew: (arcId: string) => boolean;
    onSelect: (arcId: string) => void;
}

export function ArcScheduleTabs({
    drama,
    arcs,
    selected,
    schedules,
    isNew,
    onSelect,
}: ArcScheduleTabsProps) {
    const today = hkToday();
    return (
        <div className="arc-tabs" role="tablist" aria-label={t('schedule.arcsLabel')}>
            {arcs.map(({ arc, id }) => (
                <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={id === selected}
                    aria-controls="schedule-panel"
                    onClick={() => onSelect(id)}
                >
                    <span>
                        {isNew(id) && <Pill tone="new">{t('status.newArc')}</Pill>} {arcLabel(arc)}
                    </span>
                    <small>{arcTabNote(drama, arc, Boolean(schedules[id]), today)}</small>
                </button>
            ))}
        </div>
    );
}
