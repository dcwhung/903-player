import { render, screen } from '@testing-library/react';
import { NowPlaying } from './NowPlaying';

describe('NowPlaying', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows the now-playing line', () => {
        render(<NowPlaying label="21/10（三）" connecting={false} />);

        expect(screen.getByText('現正播放：21/10（三）')).toBeInTheDocument();
    });

    it('says paused or next instead of now playing when told', () => {
        const { rerender } = render(
            <NowPlaying label="公子森林 · 第 3 / 40 集" status="paused" connecting={false} />,
        );
        expect(screen.getByText('已暫停：公子森林 · 第 3 / 40 集')).toBeInTheDocument();

        rerender(<NowPlaying label="公子森林 · 第 1 / 40 集" status="ready" connecting={false} />);
        expect(screen.getByText('下一集：公子森林 · 第 1 / 40 集')).toBeInTheDocument();
    });

    it('ends a long line in … instead of scrolling, like the portrait label', () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
        const { container } = render(
            <NowPlaying
                label="三十六計 · 第 36 / 36 集"
                detail="偷樑換柱 + 金蟬脫殼"
                connecting={false}
            />,
        );

        const boxes = [...container.querySelectorAll('[data-overflow]')];
        expect(boxes).toHaveLength(2);
        expect(boxes.every((b) => b.hasAttribute('data-static'))).toBe(true);
    });

    it('adds a second line when there is a detail', () => {
        render(
            <NowPlaying label="好朋友手牽手 · 第 2 / 4 集" detail="交換禮物" connecting={false} />,
        );

        expect(screen.getByText('現正播放：好朋友手牽手 · 第 2 / 4 集')).toBeInTheDocument();
        expect(screen.getByText('交換禮物')).toBeInTheDocument();
    });

    it('says it is connecting until the duration is known', () => {
        render(<NowPlaying label="21/10（三）" connecting />);

        expect(screen.getByText('連線中…')).toBeInTheDocument();
        expect(screen.queryByText('現正播放：21/10（三）')).not.toBeInTheDocument();
    });
});
