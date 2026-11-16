/*
 * 首頁 Banner 兩張一齊換（用戶 2026-11-12 Q10 / Q17）：揀檔 → 裁切 1 / 2 窄版 →「下一張：闊版」→
 * 裁切 2 / 2 闊版（預設沿用同一張原圖，可以「選擇其他圖片」）→「上載兩張」→ 兩張 PUT /api/assets →
 * PUT /api/banner。「上一張」返第一步（兩步嘅裁切都記住）；中途取消兩張都唔換，乜都唔寫
 */
import { useState, type ChangeEvent } from 'react';
import { putBanner } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import type { BannerImages } from '../../api/types';
import { t } from '../../i18n/t';
import { uploadChoice } from '../../ui/uploadChoice';
import { useCropSession, type CropSession } from '../../ui/useCropSession';

export const BANNER_STEPS = ['bannerStandard', 'bannerLong'] as const;

/** 兩張都裁好 → 上載兩張 → 寫 banner；回錯誤文字（成功 = undefined）；未裁好 = 明確失敗，唔當成功（S-913） */
const uploadBoth = async (
    sessions: readonly CropSession[],
    onBusy: (message: string) => void,
): Promise<string | undefined> => {
    const names: string[] = [];
    for (const [i, slot] of BANNER_STEPS.entries()) {
        const phase = sessions[i]?.phase;
        if (phase?.status !== 'ready') return t('banner.notReady');
        const uploaded = await uploadChoice(phase, slot, onBusy);
        if ('error' in uploaded) return uploaded.error;
        names.push(uploaded.name);
    }
    const [standard = '', long = ''] = names;
    try {
        await putBanner({ standard, long } satisfies BannerImages);
        return undefined;
    } catch (error) {
        return errorMessage(error);
    }
};

/** 兩步嘅裁切 session + 而家第幾步 */
const useBannerSteps = () => {
    const sessions = [useCropSession(BANNER_STEPS[0]), useCropSession(BANNER_STEPS[1])] as const;
    const [step, setStep] = useState(0);
    const next = () => {
        const first = sessions[0].phase;
        if (first?.status !== 'ready') return;
        if (!sessions[1].phase) void sessions[1].open(first.file);
        setStep(1);
    };
    const reset = () => {
        sessions.forEach((session) => session.close());
        setStep(0);
    };
    return {
        sessions,
        step,
        current: sessions[step] ?? sessions[0],
        next,
        back: () => setStep(0),
        reset,
    };
};

/** pickFile：叫隱藏 input 揀檔（ref 由頁面擁有） */
export const useBannerFlow = (pickFile: () => void, onSaved: () => void) => {
    const { sessions, step, current, next, back, reset } = useBannerSteps();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string>();
    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setError(undefined);
        if (file) void current.open(file);
    };
    const close = () => {
        reset();
        setError(undefined);
    };
    const confirm = async () => {
        setError(undefined);
        const failed = await uploadBoth(sessions, setBusy);
        setBusy(null);
        if (failed !== undefined) return setError(failed);
        close();
        onSaved();
    };
    return { step, current, busy, error, onPick, start: pickFile, next, back, close, confirm };
};

export type BannerFlow = ReturnType<typeof useBannerFlow>;
