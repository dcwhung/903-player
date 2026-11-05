import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HomeTab } from '../../../../hooks/useHomeTab';
import { HomeTabs } from './HomeTabs';

const pill = (container: HTMLElement) => container.querySelector('[data-home-tab-pill]');
const noop = () => {};

describe('HomeTabs', () => {
    it('should paint one hidden accent pill behind the buttons for the selected tab', () => {
        const { container } = render(<HomeTabs tab="shows" onChange={noop} />);

        expect(container.querySelectorAll('[data-home-tab-pill]')).toHaveLength(1);
        expect(pill(container)).toHaveAttribute('aria-hidden', 'true');
        expect(pill(container)).toHaveAttribute('data-tab', 'shows');
    });

    it('should not set a direction on the first render so the pill does not slide in', () => {
        const { container } = render(<HomeTabs tab="dramas" onChange={noop} />);

        expect(pill(container)).toHaveAttribute('data-tab', 'dramas');
        expect(pill(container)).not.toHaveAttribute('data-direction');
    });

    it('should move right when switching to 廣播劇 and left when switching back', () => {
        const { container, rerender } = render(<HomeTabs tab="shows" onChange={noop} />);

        rerender(<HomeTabs tab="dramas" onChange={noop} />);
        expect(pill(container)).toHaveAttribute('data-tab', 'dramas');
        expect(pill(container)).toHaveAttribute('data-direction', 'right');

        rerender(<HomeTabs tab="shows" onChange={noop} />);
        expect(pill(container)).toHaveAttribute('data-tab', 'shows');
        expect(pill(container)).toHaveAttribute('data-direction', 'left');
    });

    it('should keep the direction when re-rendered with the same tab', () => {
        const { container, rerender } = render(<HomeTabs tab="shows" onChange={noop} />);

        rerender(<HomeTabs tab="dramas" onChange={noop} />);
        rerender(<HomeTabs tab="dramas" onChange={noop} />);
        expect(pill(container)).toHaveAttribute('data-direction', 'right');
    });

    it('should not animate again after remounting, e.g. returning to the home page', () => {
        const { container, unmount } = render(<HomeTabs tab="shows" onChange={noop} />);
        unmount();

        const again = render(<HomeTabs tab="dramas" onChange={noop} />);
        expect(container.innerHTML).toBe('');
        expect(pill(again.container)).not.toHaveAttribute('data-direction');
    });

    it('should keep aria-pressed on the selected button only', () => {
        const { rerender } = render(<HomeTabs tab="shows" onChange={noop} />);
        const pressed = () =>
            screen.getAllByRole('button').map((button) => button.getAttribute('aria-pressed'));

        expect(pressed()).toEqual(['true', 'false']);
        rerender(<HomeTabs tab="dramas" onChange={noop} />);
        expect(pressed()).toEqual(['false', 'true']);
        expect(screen.getByRole('button', { name: '廣播劇' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('should report the clicked tab', async () => {
        const onChange = vi.fn<(tab: HomeTab) => void>();
        render(<HomeTabs tab="shows" onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));
        expect(onChange).toHaveBeenCalledWith('dramas');
    });

    describe('我的收藏 tab (P7 #7)', () => {
        const savedTab = (container: HTMLElement) =>
            container.querySelector<HTMLButtonElement>('[data-tab-id="saved"]');

        it('should keep the ★ tab collapsed, hidden and unfocusable without bookmarks', () => {
            const { container } = render(<HomeTabs tab="shows" onChange={noop} hasSaved={false} />);

            expect(screen.queryByRole('button', { name: '我的收藏' })).not.toBeInTheDocument();
            expect(savedTab(container)).toHaveAttribute('data-gone', 'true');
            expect(savedTab(container)).toHaveAttribute('aria-hidden', 'true');
            expect(savedTab(container)).toHaveAttribute('inert');
            expect(container.querySelector('[role="group"]')).toHaveAttribute(
                'data-saved',
                'false',
            );
        });

        it('should show a narrow star-only tab named 我的收藏 once something is bookmarked', () => {
            const { container } = render(<HomeTabs tab="shows" onChange={noop} hasSaved />);
            const tab = screen.getByRole('button', { name: '我的收藏' });

            expect(tab).toHaveAttribute('data-gone', 'false');
            expect(tab).toHaveTextContent('');
            expect(tab.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
            expect(container.querySelector('[role="group"]')).toHaveAttribute('data-saved', 'true');
        });

        it('should report 我的收藏 and slide the pill right onto it', async () => {
            const onChange = vi.fn<(tab: HomeTab) => void>();
            const { container, rerender } = render(
                <HomeTabs tab="dramas" onChange={onChange} hasSaved />,
            );

            await userEvent.click(screen.getByRole('button', { name: '我的收藏' }));
            expect(onChange).toHaveBeenCalledWith('saved');

            rerender(<HomeTabs tab="saved" onChange={onChange} hasSaved />);
            expect(pill(container)).toHaveAttribute('data-tab', 'saved');
            expect(pill(container)).toHaveAttribute('data-direction', 'right');
            expect(screen.getByRole('button', { name: '我的收藏' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('should slide the pill left back to 節目 when the last bookmark goes', () => {
            const { container, rerender } = render(
                <HomeTabs tab="saved" onChange={noop} hasSaved />,
            );

            rerender(<HomeTabs tab="shows" onChange={noop} hasSaved={false} />);
            expect(pill(container)).toHaveAttribute('data-tab', 'shows');
            expect(pill(container)).toHaveAttribute('data-direction', 'left');
            expect(savedTab(container)).toHaveAttribute('data-gone', 'true');
        });
    });
});
