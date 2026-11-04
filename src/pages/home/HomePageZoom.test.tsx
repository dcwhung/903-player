import { renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createHookWrapper, renderWithProviders } from '../../../tests/renderWithProviders';
import { zoomInto, zoomKey } from '../../utils/cardZoom';
import { HomePage } from './HomePage';
import { useDramaItems } from './useHomeDramaItems';

// 包住 zoomInto：記低撳咗邊格，照行 update（jsdom 冇 View Transition）
vi.mock('../../utils/cardZoom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../utils/cardZoom')>();
    return {
        ...actual,
        zoomInto: vi.fn((_key: string, update: (zoomed: boolean) => void) => update(true)),
    };
});

const tilesNav = () => within(screen.getByRole('navigation'));

describe('home tiles zoom into their pages (Z3)', () => {
    afterEach(() => vi.mocked(zoomInto).mockClear());

    it('should zoom from a show tile into its show page', async () => {
        renderWithProviders(<HomePage />);
        const tile = tilesNav().getByRole('button', { name: '公子會' });

        await userEvent.click(tile);

        const key = zoomKey.show('gongzi');
        expect(tile).toHaveAttribute('data-zoom-key', key);
        expect(zoomInto).toHaveBeenCalledWith(key, expect.any(Function));
        expect(screen.getByTestId('location')).toHaveTextContent('/show/gongzi');
    });

    it('should zoom from the today tile into the today page', async () => {
        renderWithProviders(<HomePage />);
        const tile = tilesNav().getByRole('button', { name: '今日節目' });

        await userEvent.click(tile);

        expect(tile).toHaveAttribute('data-zoom-key', zoomKey.today);
        expect(zoomInto).toHaveBeenCalledWith(zoomKey.today, expect.any(Function));
        expect(screen.getByTestId('location')).toHaveTextContent('/today');
    });

    it('should mark each drama tile with its zoom key', async () => {
        renderWithProviders(<HomePage />);

        await userEvent.click(screen.getByRole('button', { name: '廣播劇' }));

        const keys = [...document.querySelectorAll('[data-zoom-key]')].map((el) =>
            el.getAttribute('data-zoom-key'),
        );
        expect(keys.length).toBeGreaterThan(0);
        keys.forEach((key) => expect(key).toMatch(/^drama:/));
    });
});

describe('drama tiles zoom into their pages (Z3)', () => {
    afterEach(() => vi.mocked(zoomInto).mockClear());

    it('should zoom from the drama tile when it is opened', () => {
        const { wrapper } = createHookWrapper();
        const { result } = renderHook(() => useDramaItems(), { wrapper });
        const [item] = result.current;

        item?.onOpen();

        expect(zoomInto).toHaveBeenCalledWith(zoomKey.drama(item?.id ?? ''), expect.any(Function));
    });

    it('should not zoom when only resuming (stays on the home page)', () => {
        const { wrapper } = createHookWrapper();
        const { result } = renderHook(() => useDramaItems(), { wrapper });

        result.current[0]?.onResume();

        expect(zoomInto).not.toHaveBeenCalled();
    });
});
