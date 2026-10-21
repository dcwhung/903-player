import { render, screen } from '@testing-library/react';
import { Marquee } from './Marquee';

/** jsdom 冇 layout：人手設定外框同內容闊度 */
const stubWidths = (scrollWidth: number, clientWidth: number) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
};

describe('Marquee', () => {
    afterEach(() => vi.restoreAllMocks());

    it('stays still when the text fits', () => {
        stubWidths(100, 100);
        render(<Marquee text="公子會" />);

        expect(screen.getByText('公子會').parentElement).not.toHaveAttribute('data-overflow');
    });

    it('scrolls by the overflow when the text is too long', () => {
        stubWidths(180, 120);
        render(<Marquee text="今日 19/10（一）· 1:14:04 / 1:54:19" />);

        const track = screen.getByText('今日 19/10（一）· 1:14:04 / 1:54:19');
        expect(track.parentElement).toHaveAttribute('data-overflow', 'true');
        expect(track.style.getPropertyValue('--marquee-shift')).toBe('-60px');
    });
});
