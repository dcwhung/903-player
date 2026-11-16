import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconPreviews } from './IconPreviews';

const VIEWS = {
    ios: <img alt="" />,
    round: <img alt="" />,
    square: <img alt="" />,
    tab: <img alt="" />,
};

describe('IconPreviews', () => {
    it('should wrap each label so it can be kept on one line', () => {
        const { container } = render(<IconPreviews views={VIEWS} tabLabel="903 Player" />);
        const labels = [...container.querySelectorAll('.icon-prev-label')].map(
            (l) => l.textContent,
        );
        expect(labels).toEqual([
            'iPhone 主畫面',
            'Android（圓形）',
            'Android（方形）',
            '瀏覽器分頁',
        ]);
    });

    it('should keep the full tab title in a tooltip when it is truncated', () => {
        const name = '903 叱咤 Player Plus 長名稱';
        render(<IconPreviews views={VIEWS} tabLabel={name} />);
        expect(screen.getByTitle(name)).toHaveClass('tab-title');
    });

    it('should only be plain previews without onAdjust', () => {
        render(<IconPreviews views={VIEWS} tabLabel="903 Player" />);
        expect(screen.queryAllByRole('button')).toEqual([]);
    });

    it('should turn iPhone and both Android previews into keyboard buttons that open the device', async () => {
        const onAdjust = vi.fn();
        render(<IconPreviews views={VIEWS} tabLabel="903 Player" onAdjust={onAdjust} />);
        expect(
            screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
        ).toEqual(['調整 iPhone 主畫面圖示', '調整 Android 圓形圖示', '調整 Android 方形圖示']);
        await userEvent.tab();
        expect(screen.getByRole('button', { name: '調整 iPhone 主畫面圖示' })).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        await userEvent.click(screen.getByRole('button', { name: '調整 Android 圓形圖示' }));
        await userEvent.click(screen.getByRole('button', { name: '調整 Android 方形圖示' }));
        expect(onAdjust.mock.calls).toEqual([['ios'], ['android'], ['android']]);
    });
});
