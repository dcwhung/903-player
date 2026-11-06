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

const LEAVING = { text: '05/12 下架', tag: '05/12', label: '部分短篇 05/12 星期六 下架' };

describe('DramaTile availability', () => {
    beforeEach(() => stubLandscape());

    it('should put the amber leaving note top-left, after 新, and read it out', () => {
        render(<DramaShelf items={[item({ newLabel: '有新短篇', leaving: LEAVING })]} />);

        const tile = screen.getByRole('button', {
            name: '蘭茜夫人劇場，有新短篇；部分短篇 05/12 星期六 下架',
        });
        const corner = tile.querySelector('[data-corner-notes]');
        expect(corner?.textContent).toContain('新05/12 下架');
    });

    // W-533 / S-700：上架字獨立一截（唔收尾），短篇數先俾位；讀屏名有長版上架日
    it('should keep the release note whole after the arc count, and read it out', () => {
        const release = {
            text: '新短篇 後日上架',
            tag: '後日上架',
            label: '下個短篇 02/12 星期三 上架',
        };
        const resume = { label: '初戀無限次 · 第 2 集', ratio: 0.2, leaving: LEAVING };
        render(<DramaShelf items={[item({ leaving: LEAVING, release, resume })]} />);

        const tile = screen.getByRole('button', {
            name: '蘭茜夫人劇場，下個短篇 02/12 星期三 上架；部分短篇 05/12 星期六 下架',
        });
        const meta = tile.querySelector('[data-corner]');
        // 分隔符（common.separator）跟短篇數一齊收埋，所以喺 meta-count 入面
        expect(meta?.querySelector('[data-role="meta-count"]')?.textContent).toBe('3 個短篇 · ');
        expect(meta?.querySelector('[data-role="meta-release"]')?.textContent).toContain(
            '新短篇 後日上架',
        );
    });

    it('should add the leaving note after the episode on 繼續收聽', () => {
        const resume = { label: '戀愛二分一 · 第 3 集', ratio: 0.2, leaving: LEAVING };
        render(<DramaShelf items={[item({ resume })]} />);

        expect(
            screen.getByRole('button', {
                name: '蘭茜夫人劇場，繼續收聽 戀愛二分一 · 第 3 集，部分短篇 05/12 星期六 下架',
            }),
        ).toHaveTextContent('05/12 下架');
    });

    it('should grey an upcoming drama, mark it not pressable and do nothing on tap', async () => {
        const onOpen = vi.fn();
        const upcoming = {
            text: '即將上架 · 01/12',
            label: '18 樓 C 座，01/12 星期二 上架',
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
            label: '下個短篇 02/12 星期三 上架',
        };
        // 有繼續收聽條嗰陣有兩個 observer（角落字 + 條），一齊通知
        let callbacks: (() => void)[] = [];
        const notify = () => callbacks.forEach((callback) => callback());
        beforeEach(() => {
            callbacks = [];
            vi.stubGlobal(
                'ResizeObserver',
                class {
                    constructor(callback: () => void) {
                        callbacks.push(callback);
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
            expect(meta()).toHaveAttribute('data-tight');
            layout(180, 200);
            expect(meta()).not.toHaveAttribute('data-tight');
            expect(
                screen.getByRole('button', { name: /下個短篇 02\/12 星期三 上架/ }),
            ).toBeInTheDocument();
        });

        /** 角落字要幾闊：收到第幾步（data-tight）就要幾闊，冇收係 widths[0] */
        const layoutBySteps = (widths: readonly number[], room: number) => {
            vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
                this: HTMLElement,
            ) {
                return widths[Number(this.getAttribute('data-tight') ?? 0)] ?? 0;
            });
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(room);
            act(() => notify());
        };

        // E2 / W-538：同一條頂行（有繼續收聽）逐步收：全句 → 收短篇數 →「⏳ 19/12 下架」→「⏳ 19/12」
        it('should shrink the top row step by step and stop at the first step that fits', () => {
            const resume = { label: '初戀無限次 · 第 2 集', ratio: 0.2 };
            const leaving = { ...LEAVING, short: '05/12 下架' };
            render(<DramaShelf items={[item({ release, resume, leaving })]} />);

            // 每一步都短過上一步
            const widths = [200, 170, 140, 110];
            layoutBySteps(widths, 120);
            expect(meta()).toHaveAttribute('data-tight', '3');
            layoutBySteps(widths, 150);
            expect(meta()).toHaveAttribute('data-tight', '2');
            layoutBySteps(widths, 180);
            expect(meta()).toHaveAttribute('data-tight', '1');
            layoutBySteps(widths, 200);
            expect(meta()).not.toHaveAttribute('data-tight');
        });

        // W-538：冇頂行（冇繼續收聽），左上角自己量：夠位就「⏳ 19/12 下架」，唔夠位先淨日期
        it('should shrink a lone corner date only when it does not fit the tile', () => {
            const leaving = { ...LEAVING, short: '05/12 下架' };
            render(<DramaShelf items={[item({ leaving })]} />);
            const corner = () => document.querySelector<HTMLElement>('[data-corner-notes]');

            const widths = [200, 140, 100];
            layoutBySteps(widths, 150);
            expect(corner()).toHaveAttribute('data-tight', '1');
            layoutBySteps(widths, 120);
            expect(corner()).toHaveAttribute('data-tight', '2');
            layoutBySteps(widths, 200);
            expect(corner()).not.toHaveAttribute('data-tight');
        });

        it('should stop at hiding the arc count when the corner has no shorter date', () => {
            render(<DramaShelf items={[item({ release })]} />);

            layout(180, 120);
            expect(meta()).toHaveAttribute('data-tight', '1');
        });
    });

    // 用戶決定：繼續收聽條放唔落就成段收埋下架字（連「·」），集名優先；讀屏照有長版日子
    describe('leaving date on 繼續收聽', () => {
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

        /** 集名、下架字要幾闊，條有幾闊（jsdom 冇排版，自己假） */
        const layout = (text: number, leaving: number, room: number) => {
            vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(text);
            vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(leaving);
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(room);
            act(() => notify());
        };
        const line = () => document.querySelector<HTMLElement>('[data-continue-line]');

        it('should hide the whole leaving date when the episode name would be cut, and bring it back', () => {
            const resume = { label: '初戀無限次 · 第 2 集', ratio: 0.2, leaving: LEAVING };
            render(<DramaShelf items={[item({ resume })]} />);

            layout(120, 80, 150);
            expect(line()).toHaveAttribute('data-tight');
            expect(
                screen.getByRole('button', {
                    name: /^蘭茜夫人劇場，繼續收聽 .*05\/12 星期六 下架$/,
                }),
            ).toBeInTheDocument();
            layout(120, 80, 260);
            expect(line()).not.toHaveAttribute('data-tight');
        });
    });
});
