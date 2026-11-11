/*
 * ⓘ 提示（UX Icon-First：說明文字收入 tooltip）。滑鼠 hover / 鍵盤 focus 都會顯示自訂泡泡（ui/Tooltip），
 * 讀屏用 aria-label 讀全文；滑鼠唔變「?」
 */
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { TipSide } from './tooltipPlacement';

export function Tip({ text, side = 'top' }: { text: string; side?: TipSide }) {
    return (
        <Tooltip text={text} side={side}>
            <span className="tip" role="img" aria-label={text} tabIndex={0}>
                <Info aria-hidden="true" />
            </span>
        </Tooltip>
    );
}
