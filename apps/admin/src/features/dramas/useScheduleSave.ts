/*
 * 儲存排程：PUT …/schedule（If-Match = 劇集 ETag，server 展開寫入 definition）；
 * 連 enable: true，server 喺同一個 batch 將「下架」短篇轉「上架」（S-803：唔再分兩個 request，
 * 唔會出現排程存咗但轉上架失敗）；之後重讀劇集
 */
import type { ScheduleRule } from '@903-player/catalog';
import { useState } from 'react';
import { deleteSchedule, putSchedule } from '../../api/endpoints';
import { problemOf, type Problem } from '../editor/entryDraft';
import type { DramaEditorState } from './useDramaEditor';

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
            await putSchedule(state.id, arcId, rule, state.editor.entry?.etag ?? null, {
                enable: true,
            });
        });
        if (ok) await state.origin.afterSave();
    };
    const remove = (arcId: string) =>
        attempt(() => deleteSchedule(state.id, arcId).then(() => undefined));
    return { saving, problem, save, remove };
};
