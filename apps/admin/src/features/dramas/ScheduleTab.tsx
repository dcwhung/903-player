/*
 * 廣播劇 · 排程：Design Origin: mockup: _mockups_/admin/index.html#s7、_mockups_/admin-schedule-unlist ⑧ ⑨
 * 短篇 tab（#arcId 由待辦跳入嚟 / 由短篇 tab 記住就揀嗰個）→ 嗰個短篇嘅排程（儲存結果提示喺儲存掣上面，見 ArcSchedule）
 */
import { useState } from 'react';
import { t } from '../../i18n/t';
import { arcsOf, isDaily } from '../../model/raw';
import { ArcSchedule } from './ArcSchedule';
import { ArcScheduleTabs } from './ArcScheduleTabs';
import { arcIdOf } from './dramaModel';
import type { DramaEditorState } from './useDramaEditor';
import { useSchedules } from './useSchedules';
import { useScheduleSave } from './useScheduleSave';

interface ScheduleTabProps {
    state: DramaEditorState;
    initialArc: string;
    /** 撳咗嘅短篇 chip：記住，轉去短篇 tab 展開佢 */
    onPick?: (arcId: string) => void;
}

export function ScheduleTab({ state, initialArc, onPick }: ScheduleTabProps) {
    const drama = state.editor.draft?.definition ?? {};
    const arcs = arcsOf(drama).map((arc, i) => ({ arc, id: arcIdOf(arc, i) }));
    const { schedules, reload } = useSchedules(
        state.id,
        arcs.map((a) => a.id),
    );
    const actions = useScheduleSave(state, reload);
    const [selected, setSelected] = useState(
        () => arcs.find((a) => a.id === initialArc)?.id ?? arcs[0]?.id ?? '',
    );
    if (isDaily(drama)) return <p className="note info">{t('schedule.notSeries')}</p>;
    const current = arcs.find((a) => a.id === selected);
    if (!schedules) return <p className="muted">{t('app.loading')}</p>;
    if (!current) return <p className="muted">{t('drama.noArcs')}</p>;
    return (
        <>
            <ArcScheduleTabs
                drama={drama}
                images={state.editor.draft?.images ?? {}}
                arcs={arcs}
                selected={selected}
                schedules={schedules}
                isNew={state.isNewArc}
                onSelect={(arcId) => {
                    setSelected(arcId);
                    onPick?.(arcId);
                }}
            />
            <ArcSchedule
                key={`${current.id}:${schedules[current.id]?.updatedAt ?? 'none'}`}
                state={state}
                arc={current.arc}
                arcId={current.id}
                saved={schedules[current.id] ?? null}
                actions={actions}
            />
        </>
    );
}
