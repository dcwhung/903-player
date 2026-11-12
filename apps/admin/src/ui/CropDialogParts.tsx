/*
 * 裁切 dialog 嘅細件：原圖資料（本機檔 · 檔名 · 尺寸 · 格式）、載入中（S-816）、錯誤、標題列
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（header）+ #c（載入中 / 錯誤）
 */
import { TriangleAlert } from 'lucide-react';
import { t } from '../i18n/t';
import type { CropDialogStep } from './CropDialogFooter';
import { megabytes, sizeLabel } from './imageUpload';
import type { CropPhase } from './useCropSession';

/** image/jpeg → JPEG、image/webp → WebP；唔識就冇 */
const FORMAT_NAMES: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
};

function SourceMeta({ phase }: { phase: CropPhase }) {
    if (phase.status !== 'ready') return null;
    const format = FORMAT_NAMES[phase.file.type];
    const size = sizeLabel(phase.loaded.source);
    return (
        <span className="meta">
            <span className="pill info">{t('images.localFile')}</span>
            <span className="mono">{phase.name}</span>
            <span>{format ? t('images.sourceMeta', { size, format }) : size}</span>
        </span>
    );
}

export function Loading({ name, bytes }: { name: string; bytes: number }) {
    return (
        <div className="src-frame loading">
            <p className="row muted" role="status">
                <span className="spinner" aria-hidden="true" />
                {t('images.loadingFile', { name, mb: megabytes(bytes) })}
            </p>
        </div>
    );
}

export function Problem({ message }: { message: string }) {
    return (
        <p className="note bad" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{message}</span>
        </p>
    );
}

export function DialogHeader({
    titleId,
    title,
    phase,
    step,
}: {
    titleId: string;
    title: string;
    phase: CropPhase;
    step: CropDialogStep | undefined;
}) {
    return (
        <header>
            <h3>
                {step && (
                    <span className="pill info">
                        {t('images.step', { index: step.index + 1, count: step.count })}
                    </span>
                )}
                <span id={titleId}>{title}</span>
            </h3>
            <SourceMeta phase={phase} />
        </header>
    );
}
