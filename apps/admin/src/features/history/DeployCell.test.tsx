import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../../../tests/renderApp';
import type { PublishSummary } from '../../api/types';
import { DeployCell } from './DeployCell';

const row = (over: Partial<PublishSummary>): PublishSummary =>
    ({
        id: 9,
        createdAt: 'x',
        createdBy: 'a@b',
        hash: 'h',
        showCount: 0,
        dramaCount: 0,
        episodeCount: 0,
        rollbackOf: null,
        status: 'ok',
        error: null,
        current: false,
        ...over,
    }) as PublishSummary;

describe('DeployCell', () => {
    it('should show nothing for an old publish without a deploy field', () => {
        const { container } = render(<DeployCell row={row({})} onRedeploy={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should label none and skipped', () => {
        const { rerender } = render(
            <DeployCell row={row({ deploy: 'none' })} onRedeploy={vi.fn()} />,
        );
        expect(screen.getByText('無需部署')).toBeInTheDocument();
        rerender(<DeployCell row={row({ deploy: 'skipped' })} onRedeploy={vi.fn()} />);
        expect(screen.getByText('未設定自動部署')).toBeInTheDocument();
    });

    it('should offer GitHub and redeploy when a failed trigger', async () => {
        const onRedeploy = vi.fn();
        render(<DeployCell row={row({ deploy: 'failed' })} onRedeploy={onRedeploy} />);
        expect(screen.getByText('部署失敗')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '重新部署 #9' }));
        expect(onRedeploy).toHaveBeenCalledWith(9);
    });

    it('should poll a triggered publish until the run concludes', async () => {
        mockApi({
            'GET /api/publishes/9/deploy': () => ({
                body: { status: 'success', url: 'https://gh/run/1' },
            }),
        });
        render(<DeployCell row={row({ deploy: 'triggered' })} onRedeploy={vi.fn()} />);
        expect(screen.getByText('部署中')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('已部署')).toBeInTheDocument());
        expect(screen.getByRole('link', { name: '在 GitHub 查看 #9 的部署' })).toHaveAttribute(
            'href',
            'https://gh/run/1',
        );
    });
});
