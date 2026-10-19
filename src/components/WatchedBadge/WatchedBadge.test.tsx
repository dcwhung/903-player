import { render, screen } from '@testing-library/react';
import { WatchedBadge } from './WatchedBadge';

describe('WatchedBadge', () => {
    it('is announced as watched', () => {
        render(<WatchedBadge />);

        expect(screen.getByRole('img', { name: '已收聽' })).toBeInTheDocument();
    });
});
