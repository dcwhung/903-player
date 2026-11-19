import { fireEvent, screen, within } from '@testing-library/react';
import { DAY, NIGHT, renderWithSleepTimer } from '../../../../../tests/sleepTimer';
import { themeFor } from '../../../../catalog/shows';
import { CardDots } from '../../../pages/home/HomePlayerCard/CardHeader';
import { MiniPlayer, type MiniPlayerProps } from '../../../pages/home/MiniPlayer/MiniPlayer';
import { PageHeader } from '../../common/PageHeader/PageHeader';

const MOON = /^休眠/;

const miniProps = (overrides: Partial<MiniPlayerProps> = {}): MiniPlayerProps => ({
    showName: '公子會',
    region: '正在播放（今日節目）',
    openLabel: '開啟 公子會 節目頁',
    theme: themeFor('gongzi'),
    subtitle: '28/11（六） · 6:13 / 10:00',
    isPlaying: true,
    isAudible: true,
    upright: false,
    progress: 0.6,
    labels: ['公子會', 'Bad Girl大過佬'],
    keys: ['/gongzi.aac', '/badgirl.aac'],
    index: 0,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onChange: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
});

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NIGHT);
});

afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
});

describe('sleep timer placements', () => {
    it('should put the moon in the empty right cell of an inner page header at night', () => {
        renderWithSleepTimer(<PageHeader title="公子會" variant="title" onBack={vi.fn()} />);

        const header = screen.getByRole('banner');
        const moon = within(header).getByRole('button', { name: MOON });
        expect(moon).toHaveAttribute('data-placement', 'header');
        // 空位照留（現有頁頭版面零改變），月亮絕對定位喺上面
        expect(header.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    });

    it('should put the moon to the left of whatever is already on the right (list button, dots)', () => {
        renderWithSleepTimer(
            <PageHeader
                title="公子會"
                variant="title"
                onBack={vi.fn()}
                trailing={<button type="button">集數清單</button>}
            />,
        );

        const header = screen.getByRole('banner');
        const moon = within(header).getByRole('button', { name: MOON });
        expect(moon).toHaveAttribute('data-placement', 'beside');
        const list = within(header).getByRole('button', { name: '集數清單' });
        // 讀屏 / Tab 次序同畫面一樣由左至右：月亮先，清單掣（/ ⓘ）照舊係頁頭最後一粒
        expect(moon.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect([...header.querySelectorAll('button')].at(-1)).toBe(list);
    });

    it('should leave the inner page header unchanged in the daytime', () => {
        vi.setSystemTime(DAY);
        renderWithSleepTimer(<PageHeader title="公子會" variant="title" onBack={vi.fn()} />);

        expect(screen.queryByRole('button', { name: MOON })).not.toBeInTheDocument();
    });

    it('should show the moon left of the mini player play button at night', () => {
        renderWithSleepTimer(<MiniPlayer {...miniProps()} />);

        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        const moon = within(region).getByRole('button', { name: MOON });
        expect(moon).toHaveAttribute('data-placement', 'mini');
        const pause = within(region).getByRole('button', { name: '暫停' });
        expect(moon.compareDocumentPosition(pause) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should draw the timer bar on the mini player card top edge and open the menu outside the card', () => {
        renderWithSleepTimer(<MiniPlayer {...miniProps()} />);
        const region = screen.getByRole('region', { name: '正在播放（今日節目）' });
        fireEvent.click(within(region).getByRole('button', { name: MOON }));

        const dialog = screen.getByRole('dialog', { name: '休眠' });
        // 卡有 transform（左滑關閉）：選單唔可以喺卡入面，否則 position: fixed 會跟卡
        expect(region).not.toContainElement(dialog);
        fireEvent.click(within(dialog).getByRole('button', { name: '15 分鐘' }));

        const bar = within(region).getByTestId('sleep-timer-bar');
        expect(bar).toHaveAttribute('data-sleep-timer-bar', 'card');
        expect(within(region).getByRole('button', { name: MOON })).toHaveTextContent('15:00');
    });

    it('should not swipe the mini player when dragging inside the menu', () => {
        const onChange = vi.fn();
        renderWithSleepTimer(<MiniPlayer {...miniProps({ onChange })} />);
        fireEvent.click(screen.getByRole('button', { name: MOON }));
        const dialog = screen.getByRole('dialog', { name: '休眠' });

        fireEvent.pointerDown(dialog, { pointerId: 1, clientX: 300, clientY: 400, button: 0 });
        fireEvent.pointerMove(dialog, { pointerId: 1, clientX: 100, clientY: 400 });
        fireEvent.pointerUp(dialog, { pointerId: 1, clientX: 100, clientY: 400 });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('should put the moon on the dots row of the wide home player card', () => {
        renderWithSleepTimer(
            <CardDots
                keys={['/a.aac', '/b.aac']}
                labels={['公子會', 'Bad Girl大過佬']}
                index={0}
                onChange={vi.fn()}
            />,
        );

        const moon = screen.getByRole('button', { name: MOON });
        expect(moon).toHaveAttribute('data-placement', 'card');
        // 同指示點同一行（指示點喺前，月亮喺右邊）
        const dots = screen.getByRole('group', { name: /今日第 1 個節目/ });
        expect(dots.parentElement).toBe(moon.parentElement);
    });
});
