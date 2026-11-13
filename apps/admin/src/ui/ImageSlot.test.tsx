import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../../tests/renderApp';
import { hasIcon } from '../../tests/icons';
import { themeOf } from '../model/theme';
import { ImageSlot } from './ImageSlot';
import { loadSource, renderOutput } from './imageCrop';

vi.mock('./imageCrop', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./imageCrop')>()),
    loadSource: vi.fn(),
    renderOutput: vi.fn(),
}));

const PREVIEW = { name: '蘭茜', theme: themeOf({}) };

const loadedOf = (width: number, height: number) => ({
    file: new Blob(['x'], { type: 'image/jpeg' }),
    image: { width, height, close: vi.fn() } as unknown as ImageBitmap & { close: () => void },
    source: { width, height },
});

const webp = new Blob(['w'], { type: 'image/webp' });

const pick = async (name = 'photo.jpg') => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], name, { type: 'image/jpeg' }));
};

const renderSlot = (onUploaded = vi.fn(), url?: string) =>
    render(<ImageSlot slot="disc" url={url} preview={PREVIEW} onUploaded={onUploaded} />);

describe('ImageSlot', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'URL',
            Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }),
        );
        vi.mocked(loadSource).mockResolvedValue(loadedOf(1920, 1080));
        vi.mocked(renderOutput).mockResolvedValue({
            blob: webp,
            source: { width: 1920, height: 1080 },
            target: { width: 600, height: 600 },
            crop: { x: 420, y: 0, width: 1080, height: 1080 },
        });
    });

    it('should open the crop editor straight from ＋ and upload only on 上載', async () => {
        const api = mockApi({ 'PUT /api/assets': () => ({ body: { name: 'abc.webp' } }) });
        const onUploaded = vi.fn();
        renderSlot(onUploaded);
        expect(document.querySelector('input[type="file"]')).toHaveAttribute(
            'accept',
            'image/png,image/jpeg,image/webp',
        );
        await pick();
        const dialog = await screen.findByRole('dialog', { name: '上載碟面（600 × 600）' });
        expect(dialog).toHaveTextContent('本機檔');
        expect(dialog).toHaveTextContent('原圖 1920 × 1080 · JPEG');
        expect(api).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: '上載' }));
        await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('abc.webp'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should offer 置中裁切 (default) and the two whole-image candidates', async () => {
        renderSlot();
        await pick();
        const group = await screen.findByRole('group', { name: '候選' });
        const center = screen.getByRole('button', { name: '置中裁切' });
        expect(group).toContainElement(center);
        expect(center).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(screen.getByRole('button', { name: '完整 · 模糊背景' }));
        expect(screen.getByRole('button', { name: '完整 · 模糊背景' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByText('完整顯示原圖（以模糊背景填補空位）')).toBeInTheDocument();
    });

    it('should upload nothing when the editor is cancelled', async () => {
        const api = mockApi({});
        renderSlot();
        await pick();
        const cancel = await screen.findByRole('button', { name: '取消' });
        expect(hasIcon(cancel, 'x')).toBe(true);
        await userEvent.click(cancel);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(api).not.toHaveBeenCalled();
    });

    it('should link the size hints to the slot button with aria-describedby (S-817)', () => {
        renderSlot();
        const button = screen.getByRole('button', { name: '上載碟面' });
        expect(button).toHaveAccessibleDescription(
            '輸出 600 × 600 WebP；原圖建議 ≥ 600 × 600 接受 PNG / JPG / WebP，最大 20 MB、8000 × 8000 px',
        );
    });

    it('should show a too-large source as an error with 選擇其他圖片 and 關閉 (S-816)', async () => {
        vi.mocked(loadSource).mockResolvedValueOnce({ error: '檔案過大：28.4 MB，上限為 20 MB。' });
        renderSlot();
        await pick();
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('檔案過大：28.4 MB，上限為 20 MB。');
        expect(screen.getByRole('button', { name: '選擇其他圖片' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '關閉' }));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should warn in yellow when the source is smaller than the output, without blocking', async () => {
        vi.mocked(loadSource).mockResolvedValueOnce(loadedOf(480, 480));
        renderSlot();
        await pick();
        expect(
            await screen.findByText(
                '原圖 480 × 480 小於碟面 600 × 600，將放大 1.25 倍，畫質可能較模糊。',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '上載' })).toBeEnabled();
    });

    it('should keep the dialog open on Esc while uploading (S-817)', async () => {
        let finish: (response: Response) => void = () => {};
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))),
        );
        renderSlot();
        await pick();
        await userEvent.click(await screen.findByRole('button', { name: '上載' }));
        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'true'));
        // focus 要留喺 dialog 入面（唔係 disabled 嘅掣），Esc 先真係派到 dialog 嘅 keydown
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
        expect(document.activeElement).not.toBeDisabled();
        await userEvent.keyboard('{Escape}');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await userEvent.tab();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
        await act(async () => finish(new Response('{"name":"a.webp"}', { status: 200 })));
    });

    it('should close the dialog on Esc when not busy', async () => {
        renderSlot();
        await pick();
        await screen.findByRole('button', { name: '上載' });
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should return focus to the slot button when the dialog closes', async () => {
        renderSlot();
        await pick();
        await userEvent.click(await screen.findByRole('button', { name: '取消' }));
        expect(screen.getByRole('button', { name: '上載碟面' })).toHaveFocus();
    });

    it('should show R2 auto-crop progress, result and failure under the slot', () => {
        const { rerender } = render(
            <ImageSlot
                slot="disc"
                url={undefined}
                preview={PREVIEW}
                onUploaded={vi.fn()}
                auto={{ status: 'loading' }}
            />,
        );
        expect(screen.getByRole('button', { name: '上載碟面' })).toHaveAttribute(
            'aria-busy',
            'true',
        );
        expect(screen.getByText('載入中')).toBeInTheDocument();
        rerender(
            <ImageSlot
                slot="disc"
                url="https://img/d.webp"
                preview={PREVIEW}
                onUploaded={vi.fn()}
                auto={{ status: 'done', file: 'cd cover.jpg' }}
            />,
        );
        expect(screen.getByText('由 R2 cd cover.jpg 自動裁切')).toBeInTheDocument();
        rerender(
            <ImageSlot
                slot="disc"
                url={undefined}
                preview={PREVIEW}
                onUploaded={vi.fn()}
                auto={{ status: 'error', message: 'HTTP 500' }}
            />,
        );
        expect(screen.getByRole('alert')).toHaveTextContent('自動裁切失敗：HTTP 500');
    });

    it('should drop the auto-crop note once the image is replaced by hand', async () => {
        mockApi({ 'PUT /api/assets': () => ({ body: { name: 'abc.webp' } }) });
        const onUploaded = vi.fn();
        render(
            <ImageSlot
                slot="disc"
                url="https://img/d.webp"
                preview={PREVIEW}
                onUploaded={onUploaded}
                auto={{ status: 'done', file: 'cd cover.jpg' }}
            />,
        );
        expect(screen.getByText('由 R2 cd cover.jpg 自動裁切')).toBeInTheDocument();
        await pick();
        await userEvent.click(await screen.findByRole('button', { name: '上載' }));
        await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('abc.webp'));
        expect(screen.queryByText('由 R2 cd cover.jpg 自動裁切')).not.toBeInTheDocument();
    });
});
