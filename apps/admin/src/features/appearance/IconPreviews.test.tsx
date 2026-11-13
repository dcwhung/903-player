import { render, screen } from '@testing-library/react';
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
});
