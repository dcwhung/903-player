/* 「還原」：先開確認 dialog，確認先 call API；成功 / 失敗交返 caller（toast + 重讀） */
import { useState } from 'react';
import { errorMessage } from '../../api/errorMessage';

export const useRestore = (
    run: () => Promise<unknown>,
    onDone: () => void,
    onFail: (error: string) => void,
) => {
    const [confirming, setConfirming] = useState(false);
    const restore = async () => {
        setConfirming(false);
        await run().then(onDone, (error: unknown) => onFail(errorMessage(error)));
    };
    return {
        confirming,
        open: () => setConfirming(true),
        cancel: () => setConfirming(false),
        restore: () => void restore(),
    };
};
