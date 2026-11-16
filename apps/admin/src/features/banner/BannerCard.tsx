/*
 * App 外觀頁第三張卡「首頁 Banner」：Design Origin: mockup: _mockups_/admin-appearance/index.html#a
 * （v2：卡頭 = 標題 + 狀態 pill + 還原 + 更換；窄版 / 闊版兩個 slot 平均用盡闊度）
 * 狀態 pill（內建預設 / 自訂 · 未發佈 / 自訂）+ 還原（確認，danger）+ 更換（兩步裁切，useBannerFlow）；
 * 兩個 slot 顯示而家嘅圖（冇自訂 = 內建預設）。全部係草稿，發佈先上線
 */
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { deleteBanner, getBanner } from '../../api/endpoints';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { ImageFileInput } from '../../ui/ImageFileInput';
import { useToast } from '../../ui/Toast';
import { CardHead, RestoreDialog, StatusPill } from '../appearance/AppearanceParts';
import { useRestore } from '../appearance/useRestore';
import { BannerFlowDialog } from './BannerFlowDialog';
import { BannerSlots } from './BannerSlots';
import { useBannerFlow } from './useBannerFlow';

/** 讀 banner + 儲存 / 還原之後重讀（連 changes：bannerChanged） */
const useBannerData = () => {
    const banner = useResource(getBanner);
    const { changes } = useAdminData();
    const toast = useToast();
    const refresh = (message: string) => {
        toast(message);
        void banner.reload();
        void changes.reload();
    };
    return { banner, pending: changes.data?.bannerChanged === true, refresh, toast };
};

export function BannerCard() {
    const { banner, pending, refresh, toast } = useBannerData();
    const input = useRef<HTMLInputElement>(null);
    const flow = useBannerFlow(
        () => input.current?.click(),
        () => refresh(t('banner.saved')),
    );
    const restore = useRestore(
        deleteBanner,
        () => refresh(t('banner.restored')),
        (error) => toast(t('banner.saveFailed', { error })),
    );
    const current = banner.data?.banner ?? null;
    return (
        <div className="card appearance-card">
            <CardHead
                title={t('banner.title')}
                status={banner.data && <StatusPill custom={Boolean(current)} pending={pending} />}
                restoreLabel={t('banner.restoreLabel')}
                canRestore={Boolean(current)}
                onRestore={restore.open}
            >
                <button
                    type="button"
                    className="primary"
                    aria-label={t('banner.changeLabel')}
                    onClick={flow.start}
                >
                    <Upload aria-hidden="true" />
                    {t('appearance.change')}
                </button>
            </CardHead>
            <BannerSlots banner={current} disabled={!banner.data} onChange={flow.start} />
            <ImageFileInput ref={input} onPick={flow.onPick} />
            <BannerFlowDialog flow={flow} />
            {restore.confirming && (
                <RestoreDialog
                    title={t('banner.restoreTitle')}
                    body={t('banner.restoreBody')}
                    onConfirm={restore.restore}
                    onCancel={restore.cancel}
                />
            )}
        </div>
    );
}
