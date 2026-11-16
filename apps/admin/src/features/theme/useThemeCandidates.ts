/*
 * 由碟面抽色出九套候選（每個碟面 URL 抽一次）；冇碟面 = noDisc。
 * 結果記住係邊個 URL 嘅，URL 一變就當載入中（唔使喺 effect 入面同步 setState）
 */
import { useEffect, useState } from 'react';
import { errorMessage } from '../../api/errorMessage';
import { readDiscPixels } from './discPixels';
import { buildPool, extractPalette, type ThemeCandidate } from './palette';

type Result = { url: string; pool: ThemeCandidate[] } | { url: string; error: string };

export type CandidateState =
    | { status: 'noDisc' | 'loading' }
    | { status: 'ready'; pool: ThemeCandidate[] }
    | { status: 'error'; error: string };

export const useThemeCandidates = (discUrl: string | undefined): CandidateState => {
    const [result, setResult] = useState<Result | null>(null);
    useEffect(() => {
        if (!discUrl) return undefined;
        let alive = true;
        readDiscPixels(discUrl).then(
            (pixels) =>
                alive && setResult({ url: discUrl, pool: buildPool(extractPalette(pixels)) }),
            (error: unknown) => alive && setResult({ url: discUrl, error: errorMessage(error) }),
        );
        return () => {
            alive = false;
        };
    }, [discUrl]);
    if (!discUrl) return { status: 'noDisc' };
    if (result?.url !== discUrl) return { status: 'loading' };
    return 'pool' in result
        ? { status: 'ready', pool: result.pool }
        : { status: 'error', error: result.error };
};
