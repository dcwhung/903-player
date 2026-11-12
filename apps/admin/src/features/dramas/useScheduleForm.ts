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
import { keptNos } from './timelineModel';

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

/**
 * 新規則排嘅下架日早過今日（W-715）：「上架 N 日後」由每集舊上架日計，可以出過去嘅日子，儲存即時落架、預覽又冇顯示。
 * 已經落咗架（kept）嘅唔計；回第一集嘅英文原文（同 422 一樣格式，validationMessage 譯中文）
 */
const pastUnlistOf = (rule: ScheduleRule, ctx: ScheduleContext): string | undefined => {
    const kept = keptNos(ctx.unlisted);
    const past = planSchedule(rule, ctx).episodes.find(
        (e) => e.removedAt !== undefined && e.removedAt < ctx.today && !kept.has(e.no),
    );
    return past && `episode ${past.no} unlist date ${past.removedAt} is before today ${ctx.today}`;
};

/** 儲存前驗證：唔過就回 server 會回嘅 422 原文；再擋下架日早過今日（W-715，server 冇「今日」概念） */
export const saveProblemOf = (rule: ScheduleRule, ctx: ScheduleContext): string | undefined => {
    try {
        expandSchedule(rule, ctx);
    } catch (error) {
        return scheduleErrorOf(error);
    }
    return pastUnlistOf(rule, ctx);
};

export const useScheduleForm = (saved: ScheduleState | null, ctx: ScheduleContext) => {
    const [initial] = useState(() => formOf(saved?.rule ?? null, ctx));
    const [form, setForm] = useState<ScheduleForm>(initial);
    // 已儲存嘅規則經過句子正規化（例如 periodic 由下一批起計）先比較，冇改就唔算有改動
    const savedForm = saved ? formOf(saved.rule, ctx) : null;
    const baseline = savedForm ? JSON.stringify(ruleOf(savedForm, ctx)) : null;
    const rule = ruleOf(form, ctx);
    // 上架部分有冇改（S-840）：下架換返已儲存嗰個再比，淨改下架唔算；未有排程 = 成個都係新
    const listingRule = savedForm ? ruleOf({ ...form, unlist: savedForm.unlist }, ctx) : null;
    return {
        form,
        setForm,
        rule,
        dirty: JSON.stringify(rule) !== baseline,
        listingDirty: JSON.stringify(listingRule) !== baseline,
        changed: JSON.stringify(form) !== JSON.stringify(initial),
        initial,
    };
};
