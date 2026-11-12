import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { TodoRow } from '../../api/types';
import { hasIcon } from '../../../tests/icons';
import { ScanBar } from './ScanBar';

const row = (kind: TodoRow['kind']) => ({ kind }) as TodoRow;
const SCANNED = { status: 'done', scannedAt: '2026-11-10T01:41:00.000Z' } as const;

const renderBar = (props: Partial<Parameters<typeof ScanBar>[0]>) =>
    render(
        <MemoryRouter>
            <ScanBar scan={SCANNED} rows={[]} onRescan={() => {}} onTodosPage={false} {...props} />
        </MemoryRouter>,
    );

describe('ScanBar', () => {
    it('should show progress while scanning', () => {
        renderBar({ scan: { status: 'scanning' } });
        expect(screen.getByRole('status')).toHaveTextContent('正在掃描 R2…');
    });

    it('should count new content and items needing attention', () => {
        renderBar({
            rows: [row('newDrama'), row('newArc'), row('newEpisodes'), row('missingFolder')],
        });
        expect(screen.getByRole('status')).toHaveTextContent(
            '✓ 已掃描 R2（09:41）· 發現 3 項新內容、1 項需要處理',
        );
        const go = screen.getByRole('link', { name: '處理待辦' });
        expect(go).toHaveAttribute('href', '/');
        expect(go).toHaveTextContent(/^處理待辦$/);
        expect(hasIcon(go, 'arrow-right')).toBe(true);
    });

    it('should say 沒有新內容 and offer a rescan', async () => {
        const onRescan = vi.fn();
        renderBar({ onRescan });
        expect(screen.getByRole('status')).toHaveTextContent('✓ 已掃描 R2（09:41）· 沒有新內容');
        await userEvent.click(screen.getByRole('button', { name: '重新掃描' }));
        expect(onRescan).toHaveBeenCalled();
    });

    it('should report a failed scan', () => {
        renderBar({ scan: { status: 'error', error: 'HTTP 500' } });
        expect(screen.getByRole('alert')).toHaveTextContent('掃描 R2 失敗：HTTP 500');
    });
});
