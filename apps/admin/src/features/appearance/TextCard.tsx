/*
 * App 外觀頁第二張卡「名稱與簡介」：Design Origin: mockup: _mockups_/admin-appearance/index.html#c
 * 三欄 + 提示 + WhatsApp / 主畫面預覽；「儲存」有改先可以撳；App 名有改 → 確認（Q3）；「還原」（確認，Q4）
 */
import { Check } from 'lucide-react';
import { useState } from 'react';
import { deleteBrandingText, getBranding, putBrandingText } from '../../api/brandingEndpoints';
import { errorMessage } from '../../api/errorMessage';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/Toast';
import { CardHead, RestoreDialog, StatusPill } from './AppearanceParts';
import { TextFields, TextPreviews } from './TextParts';
import { useRestore } from './useRestore';
import { useTextDraft, type TextForm } from './useTextDraft';

function SaveButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            className="primary"
            aria-label={t('appearance.text.saveLabel')}
            disabled={disabled}
            onClick={onClick}
        >
            <Check aria-hidden="true" />
            {t('appearance.save')}
        </button>
    );
}

interface TextDialogsProps {
    draft: TextForm;
    confirming: boolean;
    onConfirm: () => void;
    onCancelRename: () => void;
    restore: { confirming: boolean; restore: () => void; cancel: () => void };
}

function TextDialogs({ draft, confirming, onConfirm, onCancelRename, restore }: TextDialogsProps) {
    return (
        <>
            {confirming && (
                <ConfirmDialog
                    title={t('appearance.text.renameTitle')}
                    body={t('appearance.text.renameBody', { name: draft.value.name.trim() })}
                    confirmLabel={t('appearance.save')}
                    confirmIcon={<Check aria-hidden="true" />}
                    onConfirm={onConfirm}
                    onCancel={onCancelRename}
                />
            )}
            {restore.confirming && (
                <RestoreDialog
                    title={t('appearance.text.restoreTitle')}
                    body={t('appearance.text.restoreBody')}
                    onConfirm={restore.restore}
                    onCancel={restore.cancel}
                />
            )}
        </>
    );
}

const useTextCard = () => {
    const branding = useResource(getBranding);
    const { changes } = useAdminData();
    const toast = useToast();
    const refresh = (message: string) => {
        toast(message);
        void branding.reload();
        void changes.reload();
    };
    const draft = useTextDraft(branding.data?.text ?? null, changes.data?.brandingChanged === true);
    const restore = useRestore(
        deleteBrandingText,
        () => refresh(t('appearance.text.restored')),
        (error) => toast(t('appearance.text.saveFailed', { error })),
    );
    const save = () =>
        void putBrandingText(draft.body()).then(
            () => refresh(t('appearance.text.saved')),
            (error: unknown) =>
                toast(t('appearance.text.saveFailed', { error: errorMessage(error) })),
        );
    return { branding, draft, restore, save, custom: Boolean(branding.data?.text) };
};

export function TextCard() {
    const { branding, draft, restore, save, custom } = useTextCard();
    const [confirming, setConfirming] = useState(false);
    const confirmSave = () => (setConfirming(false), save());
    return (
        <div className="card appearance-card">
            <CardHead
                title={t('appearance.text.title')}
                status={
                    branding.data && (
                        <StatusPill custom={custom} pending={draft.pending} unsaved={draft.dirty} />
                    )
                }
                restoreLabel={t('appearance.text.restoreLabel')}
                canRestore={custom}
                onRestore={restore.open}
            >
                <SaveButton
                    disabled={!draft.canSave}
                    onClick={() => (draft.nameChanged ? setConfirming(true) : confirmSave())}
                />
            </CardHead>
            <TextFields draft={draft.value} onChange={draft.set} />
            <TextPreviews draft={draft.value} icon={branding.data?.icon ?? null} />
            <TextDialogs
                draft={draft}
                confirming={confirming}
                onConfirm={confirmSave}
                onCancelRename={() => setConfirming(false)}
                restore={restore}
            />
        </div>
    );
}
