import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasBookmark } from '../../../../services/bookmarkStore';
import type { Recording } from '../../../../types/recording';
import { Toast } from '../../common/Toast/Toast';
import { showToast } from '../../common/Toast/toastStore';
import { BookmarkButton } from './BookmarkButton';

const EPISODE: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2300',
    id: 'id:https://audio.hkfm903.live/gongzi-17.mp3',
    url: 'https://audio.hkfm903.live/gongzi-17.mp3',
};

describe('BookmarkButton', () => {
    it('should show an outlined star until the episode is bookmarked', () => {
        render(<BookmarkButton track={EPISODE} label="收藏本集" />);
        const button = screen.getByRole('button', { name: '收藏本集' });

        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button.querySelector('svg')).toHaveAttribute('fill', 'none');
    });

    it('should add the episode, fill the star and say so in a toast without a confirm dialog', async () => {
        render(
            <>
                <BookmarkButton track={EPISODE} label="收藏本集" />
                <Toast />
            </>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏本集' }));

        expect(hasBookmark(EPISODE.id)).toBe(true);
        expect(screen.getByRole('button', { name: '收藏本集' })).toHaveAttribute(
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
                <BookmarkButton track={EPISODE} label="收藏本集" />
                <Toast />
            </>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏本集' }));
        await userEvent.click(screen.getByRole('button', { name: '收藏本集' }));

        expect(hasBookmark(EPISODE.id)).toBe(false);
        expect(screen.getByRole('status')).toHaveTextContent('已移除收藏');
    });

    it('should not let the press reach the row behind it', async () => {
        const onRow = vi.fn();
        render(
            <div onClick={onRow}>
                <BookmarkButton track={EPISODE} label="收藏本集" />
            </div>,
        );
        await userEvent.click(screen.getByRole('button', { name: '收藏本集' }));

        expect(onRow).not.toHaveBeenCalled();
    });

    it('should do nothing and show no toast while disabled (nothing picked)', async () => {
        render(
            <>
                <BookmarkButton track={EPISODE} label="收藏本集" disabled />
                <Toast />
            </>,
        );
        // 提示係全 app 共用（之前嘅 test 留低），先出一句別嘅，撳完要仲係佢
        act(() => showToast('之前嘅提示'));
        const button = screen.getByRole('button', { name: '收藏本集' });
        await userEvent.click(button);

        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(hasBookmark(EPISODE.id)).toBe(false);
        expect(screen.getByRole('status')).toHaveTextContent('之前嘅提示');
    });
});
