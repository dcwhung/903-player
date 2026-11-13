/*
 * 封面 / 首頁 Banner 裁切 dialog：Design Origin: mockup: _mockups_/admin-phase4/index.html#b + #c
 * 頂：（首頁 Banner 兩步時「1 / 2」pill）標題（輸出尺寸）+ 原圖資料；中：載入中 / 錯誤 / 裁切編輯器；
 * 底：取消（首頁 Banner：兩張均不更換，掣只寫「取消」）、上一張、上載（首頁 Banner 第一步：下一張：闊版）。
 * 載入中 / 上載中（busy）dialog 鎖住：Esc / 撳外面都唔收（S-817）
 */
import { useId, type RefObject } from 'react';
import { CropDialogFooter, type CropDialogStep } from './CropDialogFooter';

import { DialogHeader, Loading, Problem } from './CropDialogParts';
import { CropEditor } from './CropEditor';
import type { CropPreviewInfo } from './CropPlayerPreview';
import type { CropChoice } from './cropRender';
import type { CropSlot } from './imageUpload';
import type { CropPhase } from './useCropSession';
import { useModalKeys } from './useModalKeys';

export type { CropDialogStep } from './CropDialogFooter';

export interface ImagePreviewDialogProps {
    slot: CropSlot;
    title: string;
    phase: CropPhase;
    info: CropPreviewInfo;
    /** 轉換 / 上載中嘅說明；null = 唔忙 */
    busy: string | null;
    /** 轉換 / 上載失敗（dialog 留低，可以再試或者取消） */
    error?: string | undefined;
    step?: CropDialogStep | undefined;
    /** 首頁 Banner 第一步：「下一張：闊版」 */
    next?: boolean;
    onChoice: (choice: CropChoice) => void;
    onConfirm: () => void;
    onCancel: () => void;
    onBack?: (() => void) | undefined;
    onPickOther: () => void;
    /** 收 dialog 時 focus 返去邊度（開 dialog 嗰陣原本個掣可能已經 disabled） */
    returnFocus?: RefObject<HTMLElement | null> | undefined;
}

/** 載入中 / 錯誤 / 裁切編輯器 + 忙緊說明 + 轉換 / 上載錯誤 */
function DialogBody(props: ImagePreviewDialogProps) {
    const { phase, busy } = props;
    return (
        <>
            {phase.status === 'loading' && <Loading name={phase.name} bytes={phase.bytes} />}
            {phase.status === 'error' && <Problem message={phase.message} />}
            {phase.status === 'ready' && (
                <CropEditor
                    ready={phase}
                    slot={props.slot}
                    info={props.info}
                    disabled={busy !== null}
                    onChoice={props.onChoice}
                    onPickOther={props.onPickOther}
                />
            )}
            {busy && (
                <p className="note info" role="status">
                    <span className="spinner" aria-hidden="true" />
                    <span>{busy}</span>
                </p>
            )}
            {props.error && <Problem message={props.error} />}
        </>
    );
}

export function ImagePreviewDialog(props: ImagePreviewDialogProps) {
    const { phase, busy, step } = props;
    const titleId = useId();
    const locked = busy !== null || phase.status === 'loading';
    const { dialogRef, cancelRef, scrimProps } = useModalKeys(
        props.onCancel,
        locked,
        props.returnFocus,
    );
    const failed = phase.status === 'error';
    return (
        <div className="scrim" {...scrimProps}>
            <div
                ref={dialogRef}
                className="card crop-dialog"
                role={failed ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-busy={locked}
                tabIndex={-1}
            >
                <DialogHeader titleId={titleId} title={props.title} phase={phase} step={step} />
                <DialogBody {...props} />
                <CropDialogFooter
                    failed={failed}
                    locked={locked}
                    busy={busy !== null}
                    step={step}
                    next={props.next ?? false}
                    cancelRef={cancelRef}
                    onCancel={props.onCancel}
                    onBack={props.onBack}
                    onConfirm={props.onConfirm}
                    onPickOther={props.onPickOther}
                />
            </div>
        </div>
    );
}
