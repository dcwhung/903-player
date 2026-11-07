import { render, screen } from '@testing-library/react';
import { OnAirBadge } from './OnAirBadge';
import { OnAirLamp } from './OnAirLamp';

describe('OnAirBadge', () => {
    it('should show 播放中 with a three-bar equaliser hidden from screen readers', () => {
        render(<OnAirBadge />);
        const badge = screen.getByText('播放中');
        const equaliser = badge.querySelector('[aria-hidden="true"]');

        expect(badge).toHaveAttribute('data-on-air-badge');
        expect(equaliser?.children).toHaveLength(3);
        // 讀屏只讀字（喺有 aria-label 嘅行掣入面就由掣自己講一次）
        expect(badge).toHaveTextContent(/^播放中$/);
    });
});

describe('OnAirLamp', () => {
    it('should mark the playing row with a decorative live bar', () => {
        const { container } = render(<OnAirLamp state="live" />);
        const lamp = container.firstElementChild;

        expect(lamp).toHaveAttribute('aria-hidden', 'true');
        expect(lamp).toHaveAttribute('data-on-air-lamp', 'live');
    });

    it('should mark a paused current row with an idle bar', () => {
        const { container } = render(<OnAirLamp state="idle" className="extra" />);
        const lamp = container.firstElementChild;

        expect(lamp).toHaveAttribute('data-on-air-lamp', 'idle');
        expect(lamp?.className).toMatch(/extra/);
    });
});
