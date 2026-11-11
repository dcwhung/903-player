/*
 * ⓘ 提示（UX Icon-First：說明文字收入 tooltip）。滑鼠 hover / 鍵盤 focus 都會顯示（CSS [data-tip]），
 * 讀屏用 aria-label 讀全文
 */
import { Info } from 'lucide-react';

export function Tip({ text }: { text: string }) {
    return (
        <span className="tip" role="img" aria-label={text} data-tip={text} tabIndex={0}>
            <Info aria-hidden="true" />
        </span>
    );
}
