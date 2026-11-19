import { render, screen, within } from '@testing-library/react';
import { InfoBanner } from './InfoBanner';

const BANNER = {
    kind: 'show' as const,
    art: 'tile.webp',
    title: '公子會',
    subtitle: '逢星期六播放',
};

describe('InfoBanner', () => {
    it('should show the art with the name and schedule on it', () => {
        render(<InfoBanner banner={BANNER} />);

        const banner = screen.getByTestId('info-banner');
        expect(banner.querySelector('img')).toHaveAttribute('src', 'tile.webp');
        expect(within(banner).getByRole('heading', { name: '公子會' })).toBeInTheDocument();
        expect(within(banner).getByText('逢星期六播放')).toBeInTheDocument();
        expect(banner).toHaveAttribute('data-placement', 'sheet');
    });

    it('should mark a banner sitting on top of an episode list (rounded on its own, not edge to edge)', () => {
        // v2.0.1 用戶反饋：節目頁 / 每日劇清單頂用同一個 banner（同比例、同樣式）
        render(<InfoBanner banner={BANNER} placement="list" />);

        const banner = screen.getByTestId('info-banner');
        expect(banner).toHaveAttribute('data-placement', 'list');
        // 頁頭 h1 已經係同一個名：唔再做 heading
        expect(within(banner).getByText('公子會')).toBeInTheDocument();
        expect(within(banner).queryByRole('heading')).not.toBeInTheDocument();
    });
});
