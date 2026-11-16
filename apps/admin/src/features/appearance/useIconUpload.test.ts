/* useIconUpload 失敗路徑（S-1099）：未準備好 / 畫圖失敗 → 留喺 dialog 顯示錯誤，唔上載、唔收 dialog */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderIcons } from './iconRender';
import { uploadIcons } from './iconUpload';
import type { IconCrop } from './useIconCrop';
import { useIconUpload } from './useIconUpload';

vi.mock('./iconRender', () => ({ renderIcons: vi.fn() }));
vi.mock('./iconUpload', () => ({ uploadIcons: vi.fn() }));

const RENDER_ERROR = '畫圖失敗';

const cropOf = (overrides: Partial<IconCrop>): IconCrop =>
    ({
        ready: { loaded: {}, file: undefined, seed: {} },
        boxes: { ios: {}, android: {}, tab: {} },
        background: '#ffffff',
        same: true,
        setError: vi.fn(),
        setBusy: vi.fn(),
        session: { close: vi.fn() },
        ...overrides,
    }) as unknown as IconCrop;

describe('useIconUpload failure paths', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should show the encode error and stay open when the crop is not ready', async () => {
        const crop = cropOf({ ready: null } as unknown as Partial<IconCrop>);
        const done = vi.fn();
        await useIconUpload(crop, done)();
        expect(crop.setError).toHaveBeenLastCalledWith('無法轉換為 PNG 圖片');
        expect(renderIcons).not.toHaveBeenCalled();
        expect(crop.session.close).not.toHaveBeenCalled();
        expect(done).not.toHaveBeenCalled();
    });

    it('should show the render error, clear busy and skip the upload when rendering fails', async () => {
        vi.mocked(renderIcons).mockResolvedValue({ error: RENDER_ERROR } as never);
        const crop = cropOf({});
        const done = vi.fn();
        await useIconUpload(crop, done)();
        expect(crop.setError).toHaveBeenLastCalledWith(RENDER_ERROR);
        expect(crop.setBusy).toHaveBeenLastCalledWith(null);
        expect(uploadIcons).not.toHaveBeenCalled();
        expect(crop.session.close).not.toHaveBeenCalled();
        expect(done).not.toHaveBeenCalled();
    });
});
