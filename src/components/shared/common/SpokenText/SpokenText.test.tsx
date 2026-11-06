import { render, screen } from '@testing-library/react';
import { SpokenText } from './SpokenText';

describe('SpokenText', () => {
    it('should show the screen text to sighted users only and read the spoken text instead (E1)', () => {
        render(
            <p data-testid="line">
                <SpokenText text="本廣播劇系列 明日下架" label="本廣播劇系列 05/12 星期六 下架" />
            </p>,
        );

        expect(screen.getByText('本廣播劇系列 明日下架')).toHaveAttribute('aria-hidden', 'true');
        const spoken = screen.getByText('本廣播劇系列 05/12 星期六 下架');
        expect(spoken).not.toHaveAttribute('aria-hidden');
        expect(spoken.closest('[aria-hidden]')).toBeNull();
    });
});
