import { render, screen } from '@testing-library/react';
import { MARQUEE_GAP_PX } from './marquee';
import { Marquee } from './Marquee';

/** jsdom 冇 layout：人手設定外框同文字闊度 */
const stubWidths = (scrollWidth: number, clientWidth: number) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
};

const LONG = '今日 19/10（一）· 1:14:04 / 1:54:19';

describe('Marquee', () => {
    afterEach(() => vi.restoreAllMocks());

    it('stays still with a single copy when the text fits', () => {
        stubWidths(100, 100);
        const { container } = render(<Marquee text="公子會" />);

        expect(container.firstElementChild).not.toHaveAttribute('data-overflow');
        expect(screen.getAllByText('公子會')).toHaveLength(1);
    });

    it('loops right to left with a hidden second copy when the text is too long', () => {
        stubWidths(180, 120);
        const { container } = render(<Marquee text={LONG} />);

        const box = container.firstElementChild as HTMLElement;
        const [first, copy] = screen.getAllByText(LONG);
        expect(box).toHaveAttribute('data-overflow', 'true');
        expect(first).not.toHaveAttribute('aria-hidden');
        expect(copy).toHaveAttribute('aria-hidden', 'true');
        expect(
            (box.firstElementChild as HTMLElement).style.getPropertyValue('--marquee-shift'),
        ).toBe(`-${180 + MARQUEE_GAP_PX}px`);
    });
});
