import { render, screen } from '@testing-library/react';
import { InlineItemInfo } from './InlineItemInfo';

const INFO = { airTime: '星期一至五（06:00 - 10:00）', hosts: ['主持甲'], summary: '節目簡介' };

describe('InlineItemInfo', () => {
    it('should show the air time, labelled chips and summary when expanded', () => {
        render(<InlineItemInfo info={INFO} expanded />);
        expect(screen.getByText('星期一至五（06:00 - 10:00）')).toBeInTheDocument();
        expect(screen.getByRole('list', { name: '主持' })).toHaveTextContent('主持甲');
        expect(screen.getByText('節目簡介')).toBeInTheDocument();
    });

    it('should keep the info out of reach when collapsed', () => {
        const { container } = render(<InlineItemInfo info={INFO} expanded={false} />);
        expect(screen.queryByRole('list', { name: '主持' })).not.toBeInTheDocument();
        expect(container.querySelector('[data-expanded="false"]')).toHaveAttribute('inert');
    });

    it('should render nothing when there is no info', () => {
        const { container } = render(<InlineItemInfo info={{}} expanded />);
        expect(container).toBeEmptyDOMElement();
    });
});
