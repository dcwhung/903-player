/*
 * 排程句子嘅 state：表單 → rule、有冇改動（同已儲存規則正規化後比較）、復原；
 * 本機展開（catalog planSchedule，同 server 一套）畫時間軸；儲存前用 expandSchedule 驗（同 server 422 一樣原文）
 */
import {
    expandSchedule,
    planSchedule,
    ScheduleError,
    type SchedulePlan,
    type ScheduleRule,
} from '@903-player/catalog';
import { useState } from 'react';
import type { ScheduleState } from '../../api/types';
import { formOf, ruleOf, type ScheduleContext, type ScheduleForm } from './scheduleModel';

const scheduleErrorOf = (error: unknown): string => {
    if (!(error instanceof ScheduleError)) throw error;
    return error.message;
};

/** 規則形狀唔啱（例如冇揀星期）就回錯誤，唔畫時間軸；下架日衝突照畫（儲存時先講） */
export const planOf = (
    rule: ScheduleRule,
    ctx: ScheduleContext,
): { plan: SchedulePlan | null; error?: string } => {
    try {
        return { plan: planSchedule(rule, ctx) };
    } catch (error) {
        return { plan: null, error: scheduleErrorOf(error) };
    }
};

/** 儲存前驗證：唔過就回 server 會回嘅 422 原文（validationMessage 譯中文） */
export const saveProblemOf = (rule: ScheduleRule, ctx: ScheduleContext): string | undefined => {
    try {
        expandSchedule(rule, ctx);
        return undefined;
    } catch (error) {
        return scheduleErrorOf(error);
    }
};

export const useScheduleForm = (saved: ScheduleState | null, ctx: ScheduleContext) => {
    const [initial] = useState(() => formOf(saved?.rule ?? null, ctx));
    const [form, setForm] = useState<ScheduleForm>(initial);
    // 已儲存嘅規則經過句子正規化（例如 periodic 由下一批起計）先比較，冇改就唔算有改動
    const baseline = saved ? JSON.stringify(ruleOf(formOf(saved.rule, ctx), ctx)) : null;
    const rule = ruleOf(form, ctx);
    return {
        form,
        setForm,
        rule,
        dirty: JSON.stringify(rule) !== baseline,
        changed: JSON.stringify(form) !== JSON.stringify(initial),
        initial,
    };
};
