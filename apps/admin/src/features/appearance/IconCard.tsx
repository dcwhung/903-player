/*
 * App 外觀頁第一張卡「App 圖示」：Design Origin: mockup: _mockups_/admin-appearance/index.html#a
 * 狀態 pill（內建預設 / 自訂 · 未發佈 / 自訂）+ 還原（確認）+ 更換（dialog）；
 * 預覽：原圖、iPhone 圓角、Android 圓形 / 方形、瀏覽器分頁，置中平均用盡闊度。全部草稿，發佈先上線
 */
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { deleteBrandingIcon, getBranding } from '../../api/brandingEndpoints';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { ImageFileInput } from '../../ui/ImageFileInput';
import { useToast } from '../../ui/Toast';
import { CardHead, RestoreDialog, StatusPill } from './AppearanceParts';
import { BUILT_IN_TEXT, iconUrls } from './brandingModel';
import { IconDialog } from './IconDialog';
import { IconPreviews } from './IconPreviews';
import { renderIcons } from './iconRender';
import { uploadIcons } from './iconUpload';
import { useIconCrop } from './useIconCrop';
import { useRestore } from './useRestore';
import type { BrandingResponse } from '../../api/types';

/** 五張 PNG → 上載 → branding.icon；回錯誤文字（成功 = undefined） */
const uploadFromCrop = async (
    crop: ReturnType<typeof useIconCrop>,
): Promise<string | undefined> => {
    if (!crop.ready || !crop.boxes) return t('appearance.icon.encodeFailed');
    crop.setError(undefined);
    crop.setBusy(t('appearance.icon.rendering'));
    const blobs = await renderIcons(crop.ready.loaded, crop.boxes, crop.background);
    if ('error' in blobs) return blobs.error;
    return uploadIcons(blobs, crop.background, crop.setBusy);
};

const useIconData = () => {
    const branding = useResource(getBranding);
    const { changes } = useAdminData();
    const toast = useToast();
    const refresh = (message: string) => {
        toast(message);
        void branding.reload();
        void changes.reload();
    };
    return { branding, pending: changes.data?.brandingChanged === true, refresh, toast };
};

function IconPreviewCard({
    branding,
    name,
}: {
    branding: BrandingResponse | undefined;
    name: string;
}) {
    const urls = iconUrls(branding?.icon ?? null);
    const img = (src: string) => <img src={src} alt="" />;
    return (
        <IconPreviews
            tabLabel={name}
            views={{
                source: (
                    <span
                        className="big-slot"
                        style={{ backgroundImage: `url("${urls.source}")` }}
                        aria-hidden="true"
                    />
                ),
                ios: img(urls.appleTouch),
                round: img(urls.maskable),
                square: img(urls.maskable),
                tab: img(urls.favicon),
            }}
        />
    );
}

function ChangeButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            className="primary"
            aria-label={t('appearance.icon.changeLabel')}
            onClick={onClick}
        >
            <Upload aria-hidden="true" />
            {t('appearance.change')}
        </button>
    );
}

/** 上載 → 收 dialog → 刷新；留喺 dialog 顯示錯誤 */
const useIconUpload =
    (crop: ReturnType<typeof useIconCrop>, done: (message: string) => void) => async () => {
        const failed = await uploadFromCrop(crop);
        crop.setBusy(null);
        if (failed !== undefined) return crop.setError(failed);
        crop.session.close();
        done(t('appearance.icon.saved'));
    };

export function IconCard() {
    const { branding, pending, refresh, toast } = useIconData();
    const input = useRef<HTMLInputElement>(null);
    const crop = useIconCrop();
    const restore = useRestore(
        deleteBrandingIcon,
        () => refresh(t('appearance.icon.restored')),
        (error) => toast(t('appearance.icon.saveFailed', { error })),
    );
    const name = branding.data?.text?.name ?? BUILT_IN_TEXT.name;
    const custom = Boolean(branding.data?.icon);
    const onUpload = useIconUpload(crop, refresh);
    return (
        <div className="card appearance-card">
            <CardHead
                title={t('appearance.icon.title')}
                status={branding.data && <StatusPill custom={custom} pending={pending} />}
                restoreLabel={t('appearance.icon.restoreLabel')}
                canRestore={custom}
                onRestore={restore.open}
            >
                <ChangeButton onClick={() => input.current?.click()} />
            </CardHead>
            <IconPreviewCard branding={branding.data} name={name} />
            <ImageFileInput ref={input} onPick={crop.onPick} />
            {crop.session.phase && (
                <IconDialog
                    crop={crop}
                    tabLabel={name}
                    onUpload={() => void onUpload()}
                    onCancel={crop.session.close}
                />
            )}
            {restore.confirming && (
                <RestoreDialog
                    title={t('appearance.icon.restoreTitle')}
                    body={t('appearance.icon.restoreBody')}
                    onConfirm={restore.restore}
                    onCancel={restore.cancel}
                />
            )}
        </div>
    );
}
