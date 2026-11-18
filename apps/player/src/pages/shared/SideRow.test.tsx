import { render, screen } from '@testing-library/react';
import { SideRow } from './SideRow';

// Duo 打開・直（P10 lane 5b，S-1135）：有 side 先包一層左右並排，冇就原封不動
describe('SideRow', () => {
    it('should render the child alone without a side', () => {
        const { container } = render(
            <SideRow side={false}>
                <p>disc</p>
            </SideRow>,
        );

        expect(container.firstElementChild?.tagName).toBe('P');
    });

    it('should put the side next to the child', () => {
        render(
            <SideRow side={<p>chips</p>}>
                <p>disc</p>
            </SideRow>,
        );

        const row = screen.getByText('disc').parentElement;
        expect(row).toContainElement(screen.getByText('chips'));
    });
});
