/*
 * 「還原」掣 + 確認框（確認發佈頁時間線、編輯頁共用）：trigger(open) 畫掣，開咗先出 RevertDialog。
 * 確認框 portal 去 body：掣可能喺標題（h1）/ 圖位入面，唔好承繼佢哋嘅字型同定位
 */
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LoadedEntry } from '../../api/types';
import { RevertDialog } from './RevertDialog';
import type { RevertRow } from './revertRows';
import { useRevertAction } from './useRevertAction';

interface RevertFlowProps {
    entry: LoadedEntry;
    /** 確認框標題 / toast 用嘅名（短篇名、劇名、欄位名） */
    name: string;
    rows: readonly RevertRow[];
    onDone: () => Promise<unknown>;
    trigger: (open: () => void) => ReactNode;
}

export function RevertFlow({ entry, name, rows, onDone, trigger }: RevertFlowProps) {
    const [open, setOpen] = useState(false);
    const action = useRevertAction(onDone);
    const close = () => {
        action.reset();
        setOpen(false);
    };
    return (
        <>
            {trigger(() => setOpen(true))}
            {open &&
                createPortal(
                    <RevertDialog
                        name={name}
                        rows={rows}
                        busy={action.busy}
                        error={action.error}
                        onCancel={close}
                        onConfirm={(items) => void action.run(entry, items, name, close)}
                    />,
                    document.body,
                )}
        </>
    );
}
