/* 主頁劇集格：快將下架琥珀字、即將上架新劇灰格（P8 #6，_mockups_/coming-soon ⑦ ⑧） */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubLandscape } from '../../../../../tests/landscape';
import { DramaShelf, type DramaShelfItem } from './DramaShelf';

const item = (overrides: Partial<DramaShelfItem> = {}): DramaShelfItem => ({
    id: 'lancy',
    name: '蘭茜夫人劇場',
    art: '/art.webp',
    meta: '3 個短篇',
    onOpen: () => {},
    onResume: () => {},
    ...overrides,
});

const LEAVING = { text: '05/12 下架', tag: '05/12', label: '05/12（六）下架' };

describe('DramaTile availability', () => {
    beforeEach(() => stubLandscape());

    it('should put the amber leaving note top-left, after 新, and read it out', () => {
        render(<DramaShelf items={[item({ newLabel: '有新短篇', leaving: LEAVING })]} />);

        const tile = screen.getByRole('button', {
            name: '蘭茜夫人劇場，有新短篇，05/12（六）下架',
        });
        const corner = tile.querySelector('[data-corner-notes]');
        expect(corner?.textContent).toBe('新05/12 下架');
    });

    it('should add the leaving note after the episode on 繼續收聽', () => {
        const resume = { label: '戀愛二分一 · 第 3 集', ratio: 0.2, leaving: LEAVING };
        render(<DramaShelf items={[item({ resume })]} />);

        expect(
            screen.getByRole('button', {
                name: '蘭茜夫人劇場，繼續收聽 戀愛二分一 · 第 3 集，05/12（六）下架',
            }),
        ).toHaveTextContent('05/12 下架');
    });

    it('should grey an upcoming drama, mark it not pressable and do nothing on tap', async () => {
        const onOpen = vi.fn();
        const upcoming = {
            text: '即將上架 · 01/12',
            label: '18 樓 C 座，01/12（二）上架，未可以收聽',
        };
        render(<DramaShelf items={[item({ id: 'c18', name: '18 樓 C 座', upcoming, onOpen })]} />);

        const tile = screen.getByRole('button', { name: upcoming.label });
        expect(tile).toHaveAttribute('aria-disabled', 'true');
        expect(tile).toHaveTextContent('即將上架 · 01/12');
        expect(screen.queryByText('3 個短篇')).not.toBeInTheDocument();
        await userEvent.click(tile);
        expect(onOpen).not.toHaveBeenCalled();
    });
});
