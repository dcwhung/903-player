/* 主頁劇集格：快將下架琥珀字、即將上架新劇灰格（P8 #6，_mockups_/coming-soon ⑦ ⑧） */
import { act, render, screen } from '@testing-library/react';
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
        expect(corner?.textContent).toContain('新05/12 下架');
    });

    // W-533 / S-700：上架字獨立一截（唔收尾），短篇數先俾位；讀屏名有長版上架日
    it('should keep the release note whole after the arc count, and read it out', () => {
        const release = {
            text: '新短篇 後日上架',
            tag: '後日上架',
            label: '新短篇 02/12（三）上架',
        };
        const resume = { label: '初戀無限次 · 第 2 集', ratio: 0.2, leaving: LEAVING };
        render(<DramaShelf items={[item({ leaving: LEAVING, release, resume })]} />);

        const tile = screen.getByRole('button', {
            name: '蘭茜夫人劇場，05/12（六）下架，新短篇 02/12（三）上架',
        });
        const meta = tile.querySelector('[data-corner]');
        expect(meta?.querySelector('[data-role="meta-count"]')?.textContent).toBe('3 個短篇');
        expect(meta?.querySelector('[data-role="meta-release"]')?.textContent).toContain(
            '新短篇 後日上架',
        );
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

    // W-533 跟進：短篇數放唔落就成段（連「·」）收埋，唔出半截
    describe('arc count beside the release note', () => {
        const release = {
            text: '新短篇 後日上架',
            tag: '後日上架',
            label: '新短篇 02/12（三）上架',
        };
        let notify = () => {};
        beforeEach(() => {
            vi.stubGlobal(
                'ResizeObserver',
                class {
                    constructor(callback: () => void) {
                        notify = callback;
                    }
                    observe = vi.fn();
                    disconnect = vi.fn();
                },
            );
        });
        afterEach(() => {
            vi.unstubAllGlobals();
            vi.restoreAllMocks();
        });

        /** 角落字要幾闊 / 有幾闊（jsdom 冇排版，自己假） */
        const layout = (needed: number, room: number) => {
            vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(needed);
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(room);
            act(() => notify());
        };
        const meta = () => document.querySelector<HTMLElement>('[data-corner]');

        it('should hide the whole arc count when the corner is too tight, and bring it back', () => {
            render(<DramaShelf items={[item({ release })]} />);

            layout(180, 120);
            expect(meta()).toHaveAttribute('data-count-hidden');
            layout(180, 200);
            expect(meta()).not.toHaveAttribute('data-count-hidden');
            expect(
                screen.getByRole('button', { name: /新短篇 02\/12（三）上架/ }),
            ).toBeInTheDocument();
        });
    });
});
