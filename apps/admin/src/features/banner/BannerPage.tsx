/*
 * App 外觀頁（品牌 → App 外觀；第一區首頁 Banner，之後加 App 圖示、簡介）：Design Origin: mockup: _mockups_/admin-phase4/index.html#e
 * 狀態 pill（內建預設 / 自訂 · 未發佈 / 自訂）+ 還原（確認，danger）+ 更換（兩步裁切，useBannerFlow）；
 * 兩個 slot 顯示而家嘅圖（冇自訂 = 內建預設）。全部係草稿，發佈先上線
 */
import { Undo2, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { deleteBanner, getBanner } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import type { BannerImages } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ImageFileInput } from '../../ui/ImageFileInput';
import { Pill } from '../../ui/Pill';
import { useToast } from '../../ui/Toast';
import { BannerFlowDialog } from './BannerFlowDialog';
import { BannerSlots } from './BannerSlots';
import { useBannerFlow } from './useBannerFlow';

function StatusPill({ banner, pending }: { banner: BannerImages | null; pending: boolean }) {
    if (!banner)
        return <Pill>{t(pending ? 'banner.statusDefaultPending' : 'banner.statusDefault')}</Pill>;
    return (
        <Pill tone="ok">{t(pending ? 'banner.statusCustomPending' : 'banner.statusCustom')}</Pill>
    );
}

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

/** 還原預設：確認 dialog → DELETE /api/banner */
const useRestore = (refresh: (message: string) => void, toast: (message: string) => void) => {
    const [confirming, setConfirming] = useState(false);
    const restore = async () => {
        setConfirming(false);
        await deleteBanner().then(
            () => refresh(t('banner.restored')),
            (error: unknown) => toast(t('banner.saveFailed', { error: errorMessage(error) })),
        );
    };
    return { confirming, setConfirming, restore };
};

interface BannerHeadProps {
    status: ReactNode;
    canRestore: boolean;
    onRestore: () => void;
    onChange: () => void;
}

/** 卡頭：標題 + 狀態 pill + 還原 / 更換（掣字短，aria-label 寫明係首頁 Banner） */
const BannerHead = ({ status, canRestore, onRestore, onChange }: BannerHeadProps) => (
    <div className="banner-head">
        <h2>{t('banner.title')}</h2>
        {status}
        <button
            type="button"
            className="ghost-danger"
            aria-label={t('banner.restoreLabel')}
            disabled={!canRestore}
            onClick={onRestore}
        >
            <Undo2 aria-hidden="true" />
            {t('banner.restore')}
        </button>
        <button
            type="button"
            className="primary"
            aria-label={t('banner.changeLabel')}
            onClick={onChange}
        >
            <Upload aria-hidden="true" />
            {t('banner.change')}
        </button>
    </div>
);

export function BannerPage() {
    const { banner, pending, refresh, toast } = useBannerData();
    const input = useRef<HTMLInputElement>(null);
    const flow = useBannerFlow(
        () => input.current?.click(),
        () => refresh(t('banner.saved')),
    );
    const { confirming, setConfirming, restore } = useRestore(refresh, toast);
    const current = banner.data?.banner ?? null;
    return (
        <>
            <div className="title-row">
                <h1>{t('appearance.title')}</h1>
            </div>
            <div className="card banner-card">
                <BannerHead
                    status={banner.data && <StatusPill banner={current} pending={pending} />}
                    canRestore={Boolean(current)}
                    onRestore={() => setConfirming(true)}
                    onChange={flow.start}
                />
                <BannerSlots banner={current} disabled={!banner.data} onChange={flow.start} />
            </div>
            <ImageFileInput ref={input} onPick={flow.onPick} />
            <BannerFlowDialog flow={flow} />
            {confirming && (
                <ConfirmDialog
                    title={t('banner.restoreTitle')}
                    body={t('banner.restoreBody')}
                    confirmLabel={t('banner.restore')}
                    confirmIcon={<Undo2 aria-hidden="true" />}
                    danger
                    onConfirm={() => void restore()}
                    onCancel={() => setConfirming(false)}
                />
            )}
        </>
    );
}
