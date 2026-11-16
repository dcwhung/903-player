/*
 * 「還原」掣 + 確認框（確認發佈頁時間線、編輯頁共用）：trigger(open) 畫掣，開咗先出 RevertDialog。
 * 確認框 portal 去 body：掣可能喺標題（h1）/ 圖位入面，唔好承繼佢哋嘅字型同定位。
 * 還原完（S-1007）：重讀後觸發掣多數會 unmount，focus 搬去欄位 / 卡 / 標題（revertFocus.ts）；
 * 掣喺重讀後先 unmount（例如時間線之後先重攞變更）就喺 unmount 嗰陣搬
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { RevertItem } from '../../api/types';
import { RevertDialog } from './RevertDialog';
import { restoreLostFocus, revertFocusTarget } from './revertFocus';
import type { RevertRow } from './revertRows';
import { useRevertAction } from './useRevertAction';

/** 開框嘅事件（攞觸發掣；Safari 撳掣唔會 focus 佢，唔可以靠 activeElement） */
export type OpenRevert = (event?: { currentTarget: EventTarget | null }) => void;

interface RevertFlowProps {
    /** 確認後做嘅還原（entry：entryReverter；排序：revertOrder） */
    perform: (items: RevertItem[]) => Promise<unknown>;
    /** 確認框標題 / toast 用嘅名（短篇名、劇名、欄位名） */
    name: string;
    rows: readonly RevertRow[];
    onDone: () => Promise<unknown>;
    trigger: (open: OpenRevert) => ReactNode;
}

/** 還原完嘅 focus：重讀後即刻試；觸發掣仲喺度就等 unmount 先搬 */
const useRefocusAfter = (onDone: () => Promise<unknown>) => {
    const trigger = useRef<Element | null>(null);
    const pending = useRef<(() => HTMLElement | null) | null>(null);
    useEffect(
        () => () => {
            if (pending.current) restoreLostFocus(pending.current);
        },
        [],
    );
    const done = async () => {
        const target = revertFocusTarget(trigger.current);
        await onDone();
        if (trigger.current?.isConnected) pending.current = target;
        else restoreLostFocus(target);
    };
    const remember = (event?: { currentTarget: EventTarget | null }) => {
        const from = event?.currentTarget;
        trigger.current = from instanceof Element ? from : document.activeElement;
    };
    return { done, remember };
};

export function RevertFlow({ perform, name, rows, onDone, trigger }: RevertFlowProps) {
    const [open, setOpen] = useState(false);
    const refocus = useRefocusAfter(onDone);
    const action = useRevertAction(refocus.done);
    const close = () => {
        action.reset();
        setOpen(false);
    };
    return (
        <>
            {trigger((event) => {
                refocus.remember(event);
                setOpen(true);
            })}
            {open &&
                createPortal(
                    <RevertDialog
                        name={name}
                        rows={rows}
                        busy={action.busy}
                        error={action.error}
                        onCancel={close}
                        onConfirm={(items) => void action.run(() => perform(items), name, close)}
                    />,
                    document.body,
                )}
        </>
    );
}
