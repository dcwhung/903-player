/* 每個短篇嘅排程規則（GET …/schedule，冇 = null）：短篇 tab 細字 + 句子初始值 */
import { useCallback, useEffect, useState } from 'react';
import { getSchedule } from '../../api/endpoints';
import type { ScheduleState } from '../../api/types';

export type ScheduleMap = Record<string, ScheduleState | null>;

const loadAll = async (dramaId: string, arcIds: readonly string[]): Promise<ScheduleMap> =>
    Object.fromEntries(
        await Promise.all(arcIds.map(async (arcId) => [arcId, await getSchedule(dramaId, arcId)])),
    );

export const useSchedules = (dramaId: string, arcIds: readonly string[]) => {
    const [schedules, setSchedules] = useState<ScheduleMap | null>(null);
    const key = arcIds.join('\n');
    const reload = useCallback(
        () => loadAll(dramaId, key === '' ? [] : key.split('\n')).then(setSchedules),
        [dramaId, key],
    );
    useEffect(() => {
        void loadAll(dramaId, key === '' ? [] : key.split('\n')).then(setSchedules);
    }, [dramaId, key]);
    return { schedules, reload };
};
