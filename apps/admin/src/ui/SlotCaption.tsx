/*
 * 圖片 slot 下面（.slot-cap）：名（+「已修改」，同已發佈唔同）、R2 自動裁切狀態、錯誤；
 * 尺寸 / 格式 / 上限只畀讀屏（aria-describedby，S-817）
 */
import { t } from '../i18n/t';
import {
    sizeLabel,
    SLOT_SIZES,
    SOURCE_MAX_EDGE_PX,
    SOURCE_MAX_MB,
    type ImageSlotKind,
} from './imageUpload';
import { Pill } from './Pill';

/** R2 原圖自動裁切嘅狀態（只喺今次 session 顯示） */
export type AutoCropStatus =
    { status: 'loading' } | { status: 'done'; file: string } | { status: 'error'; message: string };

const limitsText = () => t('images.limits', { mb: SOURCE_MAX_MB, edge: SOURCE_MAX_EDGE_PX });

function AutoNote({ auto }: { auto: AutoCropStatus | undefined }) {
    if (auto?.status === 'done')
        return <span className="pill info">{t('images.autoCropped', { file: auto.file })}</span>;
    if (auto?.status !== 'error') return null;
    return (
        <span className="err small" role="alert">
            {t('images.autoFailed', { error: auto.message })}
        </span>
    );
}

interface SlotCaptionProps {
    slot: ImageSlotKind;
    auto: AutoCropStatus | undefined;
    hintId: string;
    modified: boolean;
}

export function SlotCaption({ slot, auto, hintId, modified }: SlotCaptionProps) {
    return (
        <span className="slot-cap">
            <span className="cap">
                {auto?.status === 'loading' ? t('images.autoLoading') : t(`images.${slot}`)}
                {modified && <Pill tone="warn">{t('revert.modified')}</Pill>}
            </span>
            <AutoNote auto={auto} />
            <span className="sr-only" id={hintId}>
                {`${t('images.hint', { size: sizeLabel(SLOT_SIZES[slot]) })} ${limitsText()}`}
            </span>
        </span>
    );
}
