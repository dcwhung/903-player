import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageDots } from './PageDots';

describe('PageDots', () => {
    it('shows one tab per item with the current one selected', async () => {
        const onSelect = vi.fn();
        render(
            <PageDots
                labels={['雲妮鍾情', '在晴朗的一天出發', 'Bad Girl大過佬']}
                index={1}
                onSelect={onSelect}
            />,
        );

        expect(
            screen.getByRole('tablist', { name: '今日第 2 個節目，共 3 個' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '在晴朗的一天出發' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await userEvent.click(screen.getByRole('tab', { name: 'Bad Girl大過佬' }));
        expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('renders nothing for a single item', () => {
        const { container } = render(
            <PageDots labels={['公子會']} index={0} onSelect={() => {}} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
