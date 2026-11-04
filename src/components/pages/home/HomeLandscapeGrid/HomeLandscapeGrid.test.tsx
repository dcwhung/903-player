import { render, screen, within } from '@testing-library/react';
import { FittedBanner } from './FittedBanner';
import { HomeLandscapeGrid } from './HomeLandscapeGrid';

const tiles = (count: number) =>
    Array.from({ length: count }, (_, i) => (
        <button key={`t${i}`} type="button">
            {`卡 ${i + 1}`}
        </button>
    ));

const renderGrid = (count: number) =>
    render(
        <HomeLandscapeGrid
            label="節目"
            tiles={tiles(count)}
            renderBanner={(n) => <span>{`橫額 ${n}`}</span>}
        />,
    );

/** 包住某張卡嘅格（放位用嘅 grid item） */
const cellOf = (name: string) => screen.getByRole('button', { name }).parentElement as HTMLElement;

describe('HomeLandscapeGrid', () => {
    it.each([1, 7, 8, 9, 15])('should show all %i cards, none hidden', (count) => {
        renderGrid(count);

        const nav = screen.getByRole('navigation', { name: '節目' });
        expect(within(nav).getAllByRole('button')).toHaveLength(count);
    });

    it('should hand the card count to the banner and put it first', () => {
        renderGrid(4);

        const banner = screen.getByText('橫額 4');
        const first = screen.getByRole('button', { name: '卡 1' });
        expect(
            banner.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('should place each card in its layout slot', () => {
        renderGrid(4);

        // 4 張：3 欄 × 2 行，橫額佔上排頭兩欄，第 1 張喺右上，第 2 張喺左下
        expect(cellOf('卡 1').style.gridColumn).toBe('3 / span 1');
        expect(cellOf('卡 1').style.gridRow).toBe('1');
        expect(cellOf('卡 2').style.gridColumn).toBe('1 / span 1');
        expect(cellOf('卡 2').style.gridRow).toBe('2');
        expect(screen.getByText('橫額 4').parentElement?.style.gridColumn).toBe('1 / span 2');
    });

    it('should fit up to 8 cards on one screen and scroll from 9', () => {
        const { unmount } = renderGrid(8);
        expect(screen.getByRole('navigation')).toHaveAttribute('data-scroll', 'false');
        unmount();

        renderGrid(10);
        expect(screen.getByRole('navigation')).toHaveAttribute('data-scroll', 'true');
        expect(cellOf('卡 10').style.gridColumn).toBe('6 / span 1');
        expect(cellOf('卡 10').style.gridRow).toBe('2');
    });

    it('should mark the navigation busy while loading', () => {
        render(<HomeLandscapeGrid label="節目" busy tiles={tiles(1)} renderBanner={() => null} />);

        expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
    });
});

describe('FittedBanner', () => {
    const image = () => screen.getByRole('img', { name: /903 叱咤 Player/ });

    it('should draw the standard banner scaled to the cell width for 8 cards without a mini player', () => {
        render(<FittedBanner count={8} miniPlayer={false} />);

        expect(image().getAttribute('src')).not.toMatch(/banner-wide/);
        expect(image().closest('[data-fit]')).toHaveAttribute('data-fit', 'width');
    });

    it('should switch to the long banner scaled to the cell height with a mini player', () => {
        render(<FittedBanner count={8} miniPlayer />);

        expect(image().getAttribute('src')).toMatch(/banner-wide/);
        expect(image().closest('[data-fit]')).toHaveAttribute('data-fit', 'height');
    });

    it('should shift the banner by the rule in CSS px', () => {
        render(<FittedBanner count={1} miniPlayer={false} />);

        const fit = image().closest('[data-fit]') as HTMLElement;
        expect(fit.style.getPropertyValue('--banner-shift-x')).toBe('20px');
        expect(fit.style.getPropertyValue('--banner-shift-y')).toBe('0px');
    });
});
