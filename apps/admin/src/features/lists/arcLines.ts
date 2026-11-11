/* 廣播劇列表短篇欄：> 4 個短篇就收埋已上架嗰啲（mockup ⑤：原位展開 / 收起） */
import type { Status } from '../../model/status';

export const COLLAPSE_OVER = 4;
/** 收埋時最少顯示幾多個 */
const MIN_SHOWN = 2;

export interface ArcLine {
    key: string;
    label: string;
    episodes: number;
    status: Status;
    isNew: boolean;
}

export const collapseArcs = (lines: readonly ArcLine[]): { shown: ArcLine[]; hidden: number } => {
    if (lines.length <= COLLAPSE_OVER) return { shown: [...lines], hidden: 0 };
    const notable = lines.filter((line) => line.status.tone !== 'ok' || line.isNew);
    const fill = lines
        .filter((line) => !notable.includes(line))
        .slice(0, Math.max(0, MIN_SHOWN - notable.length));
    const shown = lines.filter((line) => notable.includes(line) || fill.includes(line));
    return { shown, hidden: lines.length - shown.length };
};
