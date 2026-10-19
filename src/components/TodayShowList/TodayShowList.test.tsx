import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayShowList, type TodayShowItem } from './TodayShowList';

const ITEMS: TodayShowItem[] = [
    { key: 'a', name: 'Bad Girl大過佬', status: 'playing', active: true },
    { key: 'b', name: '雲妮鍾情', status: 'watched', active: false },
    { key: 'c', name: '在晴朗的一天出發', status: 'unwatched', active: false },
];

describe('TodayShowList', () => {
    it('shows each show with its status', () => {
        render(<TodayShowList items={ITEMS} onSelect={() => {}} />);

        expect(screen.getByRole('heading', { name: '今日節目' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /播放 Bad Girl大過佬/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByText('播放中')).toBeInTheDocument();
        expect(screen.getByText('已收聽')).toBeInTheDocument();
        expect(screen.getByText('未收聽')).toBeInTheDocument();
    });

    it('reports the selected show', async () => {
        const onSelect = vi.fn();
        render(<TodayShowList items={ITEMS} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: /播放 雲妮鍾情/ }));

        expect(onSelect).toHaveBeenCalledWith('b');
    });
});
