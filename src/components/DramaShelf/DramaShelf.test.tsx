import { render, screen, within } from '@testing-library/react';
import { DramaShelf, type DramaShelfItem } from './DramaShelf';

const item = (overrides: Partial<DramaShelfItem> = {}): DramaShelfItem => ({
    id: 'chisee',
    name: '芝See菇Bi Family',
    art: '/art.webp',
    meta: '10 個短篇',
    onOpen: () => {},
    ...overrides,
});

const metaCorner = () => screen.getByText('10 個短篇').dataset.corner;

describe('DramaShelf', () => {
    it('keeps the 短篇 count bottom-right when there is nothing to continue', () => {
        render(<DramaShelf items={[item()]} />);

        expect(screen.getByRole('button', { name: '芝See菇Bi Family' })).toBeInTheDocument();
        expect(metaCorner()).toBe('bottom');
        expect(screen.queryByText('繼續收聽')).not.toBeInTheDocument();
    });

    it('moves the count top-right to make room for 繼續收聽', () => {
        render(
            <DramaShelf items={[item({ resume: { label: '大妒忌 · 第 2 集', ratio: 0.5 } })]} />,
        );

        expect(
            screen.getByRole('button', { name: '芝See菇Bi Family，繼續收聽 大妒忌 · 第 2 集' }),
        ).toBeInTheDocument();
        expect(metaCorner()).toBe('top');
    });

    it('shows 新 top-left and reads out why', () => {
        render(<DramaShelf items={[item({ newLabel: '有新短篇' })]} />);

        const tile = screen.getByRole('button', { name: '芝See菇Bi Family，有新短篇' });
        expect(tile).toHaveTextContent('新');
    });

    it.each([1, 4, 9])(
        'puts the banner and all %i dramas in the shared phone-sideways grid, none hidden',
        (count) => {
            const items = Array.from({ length: count }, (_, i) =>
                item({ id: `d${i}`, name: `劇 ${i + 1}` }),
            );
            render(<DramaShelf items={items} renderBanner={(n) => <span>{`橫額 ${n}`}</span>} />);

            const nav = screen.getByRole('navigation', { name: '廣播劇' });
            expect(within(nav).getAllByRole('button')).toHaveLength(count);
            expect(within(nav).getByText(`橫額 ${count}`)).toBeInTheDocument();
            expect(nav).toHaveAttribute('data-scroll', String(count > 8));
        },
    );
});
