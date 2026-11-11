/*
 * 儲存排程：PUT …/schedule（If-Match = 劇集 ETag，server 展開寫入 definition）；
 * 短篇係「下架」就順手轉「上架」（新短篇預設下架，排咗期先會上架）；之後重讀劇集
 */
import type { ScheduleRule } from '@903-player/catalog';
import { useState } from 'react';
import { deleteSchedule, getEntry, putEntry, putSchedule } from '../../api/endpoints';
import { problemOf, type Problem } from '../editor/entryDraft';
import { arcsOf } from '../../model/raw';
import { arcIdOf, updateArc } from './dramaModel';
import type { DramaEditorState } from './useDramaEditor';

const enableArc = async (dramaId: string, arcId: string) => {
    const fresh = await getEntry('dramas', dramaId);
    const arc = arcsOf(fresh.definition).find((a, i) => arcIdOf(a, i) === arcId);
    if (!arc || arc.enabled !== false) return;
    const definition = updateArc(fresh.definition, arcId, (a) => ({ ...a, enabled: true }));
    await putEntry('dramas', dramaId, { definition, images: fresh.images }, fresh.etag);
};

export const useScheduleSave = (state: DramaEditorState, reloadSchedules: () => Promise<void>) => {
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState<Problem>();
    const attempt = async (work: () => Promise<void>) => {
        setSaving(true);
        setProblem(undefined);
        try {
            await work();
            await Promise.all([state.editor.reload(), reloadSchedules()]);
            return true;
        } catch (error) {
            setProblem(problemOf(error));
            return false;
        } finally {
            setSaving(false);
        }
    };
    const save = async (arcId: string, rule: ScheduleRule) => {
        const ok = await attempt(async () => {
            await putSchedule(state.id, arcId, rule, state.editor.entry?.etag ?? null);
            await enableArc(state.id, arcId);
        });
        if (ok) await state.origin.afterSave();
    };
    const remove = (arcId: string) =>
        attempt(() => deleteSchedule(state.id, arcId).then(() => undefined));
    return { saving, problem, save, remove };
};
