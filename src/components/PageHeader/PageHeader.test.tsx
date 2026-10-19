import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
    it('shows the title and calls onBack', async () => {
        const onBack = vi.fn();
        render(<PageHeader title="正在播放" onBack={onBack} />);

        expect(screen.getByText('正在播放')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('shows a show name as the page heading', () => {
        render(<PageHeader title="Bad Girl大過佬" variant="title" onBack={vi.fn()} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bad Girl大過佬');
    });
});
