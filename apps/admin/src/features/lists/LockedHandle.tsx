/* 唔可以拖嘅行（已下架 / 未上架）：灰色 ⠿，讀屏跳過 */
import { GripVertical } from 'lucide-react';

export function LockedHandle() {
    return (
        <span className="handle locked" aria-hidden="true">
            <GripVertical />
        </span>
    );
}
