import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows the title and calls onBack', async () => {
        const onBack = vi.fn();
        render(<PageHeader title="正在播放" onBack={onBack} />);

        expect(screen.getByText('正在播放')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('shows a show name as the page heading', () => {
        render(<PageHeader title="Bad Girl大過佬" variant="title" onBack={vi.fn()} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bad Girl大過佬');
    });

    it('should shrink a long show name to fit the header width', () => {
        const realStyle = window.getComputedStyle.bind(window);
        // jsdom 冇 layout：CSS 字體當 24px（--font-size-xl），標題格 179px，中文字闊 ≈ 字體大小
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            const style = realStyle(el);
            return new Proxy(style, {
                get: (target, key) => {
                    if (key === 'fontSize') return '24px';
                    const value: unknown = Reflect.get(target, key);
                    return typeof value === 'function' ? value.bind(target) : value;
                },
            });
        });
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(179);
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
            this: HTMLElement,
        ) {
            return parseFloat(this.style.fontSize || '24') * 8;
        });

        render(<PageHeader title="在晴朗的一天出發" variant="title" onBack={vi.fn()} />);

        expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe('22px');
    });

    it('should keep the CSS size when the show name fits', () => {
        render(<PageHeader title="公子會" variant="title" onBack={vi.fn()} />);

        expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe('');
    });
});
