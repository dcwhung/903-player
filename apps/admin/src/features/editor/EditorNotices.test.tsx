import { render, screen } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
import { EditorNotices } from './EditorNotices';

const renderInvalid = (detail: string) =>
    render(
        <EditorNotices
            status={{ saving: false, problem: { type: 'invalid', detail }, warnings: [] }}
            fieldErrors={0}
            onReload={vi.fn()}
        />,
    );

describe('EditorNotices', () => {
    it('should explain a known validation error in Chinese', () => {
        renderInvalid('shows/abc: tile: no file tile.webp in the folder');
        expect(screen.getByRole('alert')).toHaveTextContent(
            '無法儲存：節目「abc」未有 Banner 圖片，請先上載。',
        );
        expect(screen.queryByText(/no file/)).not.toBeInTheDocument();
    });

    it('should show a general message with the original text in a collapsible note', () => {
        renderInvalid('dramas/golden: audio.file: unknown token {x}');
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('無法儲存：資料驗證失敗，請檢查後再試。');
        const details = alert.querySelector('details');
        expect(details).not.toBeNull();
        expect(details).not.toHaveAttribute('open');
        expect(details).toHaveTextContent('dramas/golden: audio.file: unknown token {x}');
    });

    it('should show a refresh icon on 重新載入 after a conflict', () => {
        render(
            <EditorNotices
                status={{
                    saving: false,
                    problem: { type: 'conflict', at: '2026-11-11T01:00:00.000Z' },
                    warnings: [],
                }}
                fieldErrors={0}
                onReload={vi.fn()}
            />,
        );
        expect(hasIcon(screen.getByRole('button', { name: '重新載入' }), 'refresh-cw')).toBe(true);
    });

    it('should mark 重新登入（新分頁） with an external-link icon', () => {
        render(
            <EditorNotices
                status={{ saving: false, problem: { type: 'unauthorized' }, warnings: [] }}
                fieldErrors={0}
                onReload={vi.fn()}
            />,
        );
        const relogin = screen.getByRole('link', { name: '重新登入（新分頁）' });
        expect(hasIcon(relogin, 'external-link')).toBe(true);
    });
});
