import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageDots } from './PageDots';

describe('PageDots', () => {
    it('shows one button per item in a labelled group, marking the current one', async () => {
        const onSelect = vi.fn();
        render(
            <PageDots
                keys={['a', 'b', 'c']}
                labels={['雲妮鍾情', '在晴朗的一天出發', 'Bad Girl大過佬']}
                index={1}
                onSelect={onSelect}
            />,
        );

        const group = screen.getByRole('group', { name: '今日第 2 個節目，共 3 個' });
        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(group.querySelectorAll('button')).toHaveLength(3);
        const current = screen.getByRole('button', { name: '在晴朗的一天出發' });
        expect(current).toHaveAttribute('aria-current', 'true');
        expect(current).not.toHaveAttribute('aria-selected');
        expect(screen.getByRole('button', { name: '雲妮鍾情' })).not.toHaveAttribute(
            'aria-current',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Bad Girl大過佬' }));
        expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('keys the dots by recording, so the same show twice in a day is fine', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <PageDots
                keys={['/gongzi/0600.aac', '/gongzi/2308.aac']}
                labels={['公子會', '公子會']}
                index={0}
                onSelect={() => {}}
            />,
        );

        expect(screen.getAllByRole('button', { name: '公子會' })).toHaveLength(2);
        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });

    it('renders nothing for a single item', () => {
        const { container } = render(
            <PageDots keys={['a']} labels={['公子會']} index={0} onSelect={() => {}} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
