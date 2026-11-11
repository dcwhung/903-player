/* 句子一改就（稍等一陣）POST …/schedule/preview：展開結果畫集數條 / 批次表 */
import type { ExpandedSchedule, ScheduleRule } from '@903-player/catalog';
import { useEffect, useState } from 'react';
import { previewSchedule } from '../../api/endpoints';

const PREVIEW_DELAY_MS = 300;

export interface Preview {
    expanded: ExpandedSchedule | null;
    error?: string;
}

export const useSchedulePreview = (dramaId: string, arcId: string, rule: ScheduleRule | null) => {
    const [preview, setPreview] = useState<Preview>({ expanded: null });
    const ruleKey = rule === null ? '' : JSON.stringify(rule);
    useEffect(() => {
        if (ruleKey === '') return undefined;
        let alive = true;
        const timer = setTimeout(() => {
            previewSchedule(dramaId, arcId, JSON.parse(ruleKey) as ScheduleRule).then(
                (result) => alive && setPreview({ expanded: result.expanded }),
                (error: unknown) =>
                    alive &&
                    setPreview({
                        expanded: null,
                        error: error instanceof Error ? error.message : String(error),
                    }),
            );
        }, PREVIEW_DELAY_MS);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [dramaId, arcId, ruleKey]);
    return preview;
};
