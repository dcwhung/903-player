import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasBookmark } from '../../../../services/bookmarkStore';
import type { Recording } from '../../../../types/recording';
import { Toast } from '../../common/Toast/Toast';
import { BookmarkButton } from './BookmarkButton';

const EPISODE: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2300',
    url: 'https://audio.hkfm903.live/gongzi-17.mp3',
};

describe('BookmarkButton', () => {
    it('should show an outlined star until the episode is bookmarked', () => {
        render(<BookmarkButton track={EPISODE} label="收藏呢集" />);
        const button = screen.getByRole('button', { name: '收藏呢集' });

        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button.querySelector('svg')).toHaveAttribute('fill', 'none');
    });

    it('should add the episode, fill the star and say so in a toast without a confirm dialog', async () => {
        render(
            <>
                <BookmarkButton track={EPISODE} label="收藏呢集" />
                <Toast />
            </>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏呢集' }));

        expect(hasBookmark(EPISODE.url)).toBe(true);
        expect(screen.getByRole('button', { name: '收藏呢集' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button').querySelector('svg')).toHaveAttribute(
            'fill',
            'currentColor',
        );
        expect(screen.getByRole('status')).toHaveTextContent('已加入收藏');
    });

    it('should remove it again on the second press', async () => {
        render(
            <>
                <BookmarkButton track={EPISODE} label="收藏呢集" />
                <Toast />
            </>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏呢集' }));
        await userEvent.click(screen.getByRole('button', { name: '收藏呢集' }));

        expect(hasBookmark(EPISODE.url)).toBe(false);
        expect(screen.getByRole('status')).toHaveTextContent('已移除收藏');
    });

    it('should not let the press reach the row behind it', async () => {
        const onRow = vi.fn();
        render(
            <div onClick={onRow}>
                <BookmarkButton track={EPISODE} label="收藏呢集" />
            </div>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏呢集' }));

        expect(onRow).not.toHaveBeenCalled();
    });
});
