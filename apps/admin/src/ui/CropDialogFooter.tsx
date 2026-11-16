/*
 * 裁切 dialog 底部掣：Design Origin: mockup: _mockups_/admin-phase4/index.html#b / #c（footer）
 * 一般：取消（首頁 Banner 兩步都係「取消」，兩張均不更換）· 上一張 · 上載 / 下一張：闊版 / 上載兩張；
 * 錯誤：選擇其他圖片 · 關閉
 */
import { ArrowLeft, ArrowRight, Upload, X } from 'lucide-react';
import type { RefObject } from 'react';
import { t } from '../i18n/t';

/** 首頁 Banner 兩步（0 = 窄版、1 = 闊版） */
export interface CropDialogStep {
    index: number;
    count: number;
}

interface CropDialogFooterProps {
    failed: boolean;
    locked: boolean;
    busy: boolean;
    step: CropDialogStep | undefined;
    next: boolean;
    cancelRef: RefObject<HTMLButtonElement | null>;
    onCancel: () => void;
    onBack?: (() => void) | undefined;
    onConfirm: () => void;
    onPickOther: () => void;
}

const confirmLabel = (next: boolean, step: CropDialogStep | undefined) => {
    if (next) return t('images.nextWide');
    return step ? t('images.confirmBoth') : t('images.confirm');
};

function ConfirmIcon({ busy, next }: { busy: boolean; next: boolean }) {
    if (busy) return <span className="spinner" aria-hidden="true" />;
    return next ? <ArrowRight aria-hidden="true" /> : <Upload aria-hidden="true" />;
}

export function CropDialogFooter(props: CropDialogFooterProps) {
    const { failed, locked, busy, step, next, cancelRef } = props;
    if (failed)
        return (
            <footer className="actions end">
                <button type="button" onClick={props.onPickOther}>
                    <Upload aria-hidden="true" />
                    {t('images.pickOther')}
                </button>
                <button type="button" ref={cancelRef} className="primary" onClick={props.onCancel}>
                    <X aria-hidden="true" />
                    {t('images.close')}
                </button>
            </footer>
        );
    return (
        <footer className="actions end">
            <button type="button" ref={cancelRef} onClick={props.onCancel} disabled={locked}>
                <X aria-hidden="true" />
                {t('images.cancel')}
            </button>
            {props.onBack && (
                <button type="button" onClick={props.onBack} disabled={locked}>
                    <ArrowLeft aria-hidden="true" />
                    {t('images.back')}
                </button>
            )}
            <button
                type="button"
                className="primary"
                onClick={props.onConfirm}
                disabled={locked}
                aria-busy={busy}
            >
                <ConfirmIcon busy={busy} next={next} />
                {busy ? t('images.uploading') : confirmLabel(next, step)}
            </button>
        </footer>
    );
}
