/*
 * 儲存排程：PUT …/schedule（If-Match = 劇集 ETag，server 展開寫入 definition）；
 * 連 enable: true，server 喺同一個 batch 將「下架」短篇轉「上架」（S-803：唔再分兩個 request，
 * 唔會出現排程存咗但轉上架失敗）；之後重讀劇集。
 * reject：本機驗證唔過（例如下架日唔遲過上架日）就同 server 422 一樣出錯誤提示，唔送 request；
 * clear：改設定就收返錯誤提示（mockup ⑧：錯誤只喺撳儲存時出）
 */
import type { ScheduleRule } from '@903-player/catalog';
import { useState } from 'react';
import { deleteSchedule, putSchedule } from '../../api/endpoints';
import { useAdminData } from '../../data/AdminData';
import { problemOf, type Problem } from '../editor/entryDraft';
import type { DramaEditorState } from './useDramaEditor';

/** 做一個寫入 → 成功就做 reload（重讀劇集 + 排程）；失敗記低問題。回成功與否 */
const useAttempt = (reload: () => Promise<unknown>) => {
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState<Problem>();
    const attempt = async (work: () => Promise<unknown>) => {
        setSaving(true);
        setProblem(undefined);
        try {
            await work();
            await reload();
            return true;
        } catch (error) {
            setProblem(problemOf(error));
            return false;
        } finally {
            setSaving(false);
        }
    };
    return { saving, problem, setProblem, attempt };
};

export const useScheduleSave = (state: DramaEditorState, reloadSchedules: () => Promise<void>) => {
    const { refresh } = useAdminData();
    const { saving, problem, setProblem, attempt } = useAttempt(() =>
        Promise.all([state.editor.reload(), reloadSchedules()]),
    );
    const save = async (arcId: string, rule: ScheduleRule) => {
        const etag = state.editor.entry?.etag ?? null;
        const put = () => putSchedule(state.id, arcId, rule, etag, { enable: true });
        if (await attempt(put)) await state.origin.afterSave();
    };
    /** 刪完同儲存一樣刷新共用資料（待辦 / nav 數字）；唔返待辦（冇嘢儲存） */
    const remove = async (arcId: string) => {
        if (await attempt(() => deleteSchedule(state.id, arcId))) await refresh();
    };
    const reject = (detail: string) => setProblem({ type: 'invalid', detail });
    const clear = () => setProblem(undefined);
    return { saving, problem, save, remove, reject, clear };
};
