/*
 * App 外觀頁第一張卡「App 圖示」：Design Origin: mockup: _mockups_/admin-appearance/index.html#a
 * 狀態 pill（內建預設 / 自訂 · 未發佈 / 自訂）+ 還原（確認）+ 更換（dialog）；
 * 預覽：原圖、iPhone 圓角、Android 圓形 / 方形、瀏覽器分頁，置中平均用盡闊度。全部草稿，發佈先上線。
 * iPhone / Android 預覽撳得（icon recrop）：由原圖 + 上次嘅框開 dialog，單獨調嗰個裝置
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
import {
    BUILT_IN_TEXT,
    iconSourceRequest,
    iconUrls,
    type IconSourceRequest,
} from './brandingModel';
import { IconDialog } from './IconDialog';
import { IconPreviews } from './IconPreviews';
import type { AdjustableDevice } from './iconModel';
import { useIconCrop } from './useIconCrop';
import { useIconUpload } from './useIconUpload';
import { useRestore } from './useRestore';
import type { BrandingResponse } from '../../api/types';

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
    onAdjust,
}: {
    branding: BrandingResponse | undefined;
    name: string;
    onAdjust: (request: IconSourceRequest) => void;
}) {
    const urls = iconUrls(branding?.icon ?? null);
    // branding 未載入就唔知由邊張原圖開始：預覽暫時唔撳得
    const adjust =
        branding &&
        ((device: AdjustableDevice) => onAdjust(iconSourceRequest(branding.icon, device)));
    const img = (src: string) => <img src={src} alt="" />;
    return (
        <IconPreviews
            tabLabel={name}
            onAdjust={adjust}
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
            <IconPreviewCard branding={branding.data} name={name} onAdjust={crop.adjust} />
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
