import { fireEvent, render, screen } from '@testing-library/react';
import { EpisodeTitles } from './EpisodeTitles';

describe('EpisodeTitles', () => {
    it('should list episodes as 第 X 集 ｜ 標題 lines', () => {
        render(
            <EpisodeTitles
                arc={{ episodes: 3, titles: { 3: '初次見面' } }}
                onTitles={() => {}}
                onErrors={() => {}}
            />,
        );
        expect(screen.getByRole('textbox', { name: '各集標題' })).toHaveValue(
            '第 1 集 ｜ \n第 2 集 ｜ \n第 3 集 ｜ 初次見面',
        );
    });

    it('should report line errors and only emit titles when valid', () => {
        const onTitles = vi.fn();
        const onErrors = vi.fn();
        render(<EpisodeTitles arc={{ episodes: 2 }} onTitles={onTitles} onErrors={onErrors} />);
        const box = screen.getByRole('textbox', { name: '各集標題' });
        fireEvent.change(box, { target: { value: '第 1 集 ｜ 開始\n第 9 集 ｜ 超出' } });
        expect(box).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent('第 2 行');
        expect(onErrors).toHaveBeenLastCalledWith(1);
        expect(onTitles).not.toHaveBeenCalled();
        fireEvent.change(box, { target: { value: '第 1 集 ｜ 開始\n第 2 集 ｜ 大結局' } });
        expect(onErrors).toHaveBeenLastCalledWith(0);
        expect(onTitles).toHaveBeenLastCalledWith({ 1: '開始', 2: '大結局' });
    });
});
