import { render, screen } from '@testing-library/react';
import { TodayEmpty } from './TodayEmpty';

describe('TodayEmpty', () => {
    it('says today is not up yet and that it will show up by itself', () => {
        render(<TodayEmpty />);

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('今日節目未上架');
        expect(status).toHaveTextContent('上架之後會自動顯示');
    });

    it('draws a grey ring with no slider or play button', () => {
        const { container } = render(<TodayEmpty />);

        expect(container.querySelector('svg circle')).not.toBeNull();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
