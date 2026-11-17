import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { SegmentedTabs } from './SegmentedTabs';

type Fruit = 'apple' | 'banana' | 'cherry';

const FRUITS = [
    { value: 'apple', label: '蘋果', icon: Pencil },
    { value: 'banana', label: '香蕉' },
    { value: 'cherry', label: '車厘子' },
] as const;

/** 受控 wrapper：onChange 會真係改 value，方便測鍵盤導航 */
function Controlled({
    mode,
    initial = 'apple',
    disabled,
    onChange,
}: {
    mode: 'tabs' | 'toggle';
    initial?: Fruit;
    disabled?: boolean;
    onChange?: (value: Fruit) => void;
}) {
    const [value, setValue] = useState<Fruit>(initial);
    return (
        <SegmentedTabs
            mode={mode}
            label="水果"
            options={FRUITS}
            value={value}
            disabled={disabled}
            panelId="fruit-panel"
            onChange={(next) => {
                setValue(next);
                onChange?.(next);
            }}
        />
    );
}

const pillOf = (group: HTMLElement) => group.querySelector('.seg-tabs-pill');

describe('SegmentedTabs — tabs mode', () => {
    it('should render a named tablist whose selected tab controls the panel', () => {
        render(<Controlled mode="tabs" />);
        expect(screen.getByRole('tablist', { name: '水果' })).toBeInTheDocument();
        const apple = screen.getByRole('tab', { name: '蘋果' });
        expect(apple).toHaveAttribute('aria-selected', 'true');
        expect(apple).toHaveAttribute('aria-controls', 'fruit-panel');
        expect(screen.getByRole('tab', { name: '香蕉' })).toHaveAttribute('aria-selected', 'false');
    });

    it('should use a roving tabIndex so only the selected tab is in the tab order', () => {
        render(<Controlled mode="tabs" initial="banana" />);
        expect(screen.getByRole('tab', { name: '香蕉' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('tab', { name: '蘋果' })).toHaveAttribute('tabindex', '-1');
        expect(screen.getByRole('tab', { name: '車厘子' })).toHaveAttribute('tabindex', '-1');
    });

    it('should select and focus the next tab with arrow keys, wrapping around', () => {
        const onChange = vi.fn();
        render(<Controlled mode="tabs" onChange={onChange} />);
        const apple = screen.getByRole('tab', { name: '蘋果' });
        fireEvent.keyDown(apple, { key: 'ArrowRight' });
        const banana = screen.getByRole('tab', { name: '香蕉' });
        expect(banana).toHaveAttribute('aria-selected', 'true');
        expect(banana).toHaveFocus();
        fireEvent.keyDown(banana, { key: 'ArrowLeft' });
        fireEvent.keyDown(apple, { key: 'ArrowLeft' });
        expect(screen.getByRole('tab', { name: '車厘子' })).toHaveFocus();
        expect(onChange).toHaveBeenLastCalledWith('cherry');
    });

    it('should jump to the first and last tab with Home and End', () => {
        render(<Controlled mode="tabs" initial="banana" />);
        fireEvent.keyDown(screen.getByRole('tab', { name: '香蕉' }), { key: 'End' });
        expect(screen.getByRole('tab', { name: '車厘子' })).toHaveFocus();
        fireEvent.keyDown(screen.getByRole('tab', { name: '車厘子' }), { key: 'Home' });
        expect(screen.getByRole('tab', { name: '蘋果' })).toHaveAttribute('aria-selected', 'true');
    });

    it('should render option icons hidden from assistive tech', () => {
        render(<Controlled mode="tabs" />);
        const icon = screen.getByRole('tab', { name: '蘋果' }).querySelector('svg');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('SegmentedTabs — toggle mode', () => {
    it('should render a named group of pressed buttons and report clicks', async () => {
        const onChange = vi.fn();
        render(<Controlled mode="toggle" onChange={onChange} />);
        expect(screen.getByRole('group', { name: '水果' })).toBeInTheDocument();
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '蘋果' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '香蕉' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        await userEvent.click(screen.getByRole('button', { name: '香蕉' }));
        expect(onChange).toHaveBeenCalledWith('banana');
        expect(screen.getByRole('button', { name: '香蕉' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('should keep every button in the tab order and not expose tab semantics', () => {
        render(<Controlled mode="toggle" />);
        const banana = screen.getByRole('button', { name: '香蕉' });
        expect(banana).not.toHaveAttribute('tabindex');
        expect(banana).not.toHaveAttribute('aria-controls');
        expect(banana).not.toHaveAttribute('aria-selected');
    });

    it('should move the choice and focus with arrow keys', () => {
        render(<Controlled mode="toggle" />);
        fireEvent.keyDown(screen.getByRole('button', { name: '蘋果' }), { key: 'ArrowRight' });
        const banana = screen.getByRole('button', { name: '香蕉' });
        expect(banana).toHaveAttribute('aria-pressed', 'true');
        expect(banana).toHaveFocus();
    });
});

describe('SegmentedTabs — disabled', () => {
    it('should disable every option and show none as chosen', () => {
        render(<Controlled mode="toggle" disabled />);
        for (const button of screen.getAllByRole('button')) {
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute('aria-pressed', 'false');
        }
        expect(pillOf(screen.getByRole('group', { name: '水果' }))).not.toBeInTheDocument();
    });

    it('should ignore arrow keys while disabled', () => {
        const onChange = vi.fn();
        render(<Controlled mode="tabs" disabled onChange={onChange} />);
        fireEvent.keyDown(screen.getByRole('tab', { name: '蘋果' }), { key: 'ArrowRight' });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('tab', { name: '蘋果' })).toHaveAttribute('aria-selected', 'false');
    });
});

describe('SegmentedTabs — sliding pill', () => {
    it('should position one shared, hidden pill with --seg-index and --seg-count', () => {
        render(<Controlled mode="tabs" initial="banana" />);
        const group = screen.getByRole('tablist', { name: '水果' });
        expect(group).toHaveClass('seg-tabs');
        expect(group.style.getPropertyValue('--seg-count')).toBe('3');
        expect(group.style.getPropertyValue('--seg-index')).toBe('1');
        expect(pillOf(group)).toHaveAttribute('aria-hidden', 'true');
    });

    it('should follow the selection and record the slide direction', () => {
        render(<Controlled mode="tabs" />);
        const group = screen.getByRole('tablist', { name: '水果' });
        fireEvent.keyDown(screen.getByRole('tab', { name: '蘋果' }), { key: 'End' });
        expect(group.style.getPropertyValue('--seg-index')).toBe('2');
        expect(pillOf(group)).toHaveAttribute('data-direction', 'forward');
        fireEvent.keyDown(screen.getByRole('tab', { name: '車厘子' }), { key: 'ArrowLeft' });
        expect(pillOf(group)).toHaveAttribute('data-direction', 'back');
    });

    it('should append a caller className to the group', () => {
        render(
            <SegmentedTabs
                mode="toggle"
                label="水果"
                options={FRUITS}
                value="apple"
                className="extra"
                onChange={() => {}}
            />,
        );
        expect(screen.getByRole('group', { name: '水果' })).toHaveClass('seg-tabs', 'extra');
    });
});

// 由舊 ui/Switch 測試搬過嚟（劇集類型：短篇集 / 每日播）
describe('SegmentedTabs — 類型 toggle (was Switch)', () => {
    it('should mark the selected option as pressed and report changes', async () => {
        const onChange = vi.fn();
        const options = [
            { value: 'series', label: '短篇集' },
            { value: 'daily', label: '每日播' },
        ] as const;
        render(
            <SegmentedTabs
                mode="toggle"
                label="類型"
                value="series"
                options={options}
                onChange={onChange}
            />,
        );
        expect(screen.getByRole('group', { name: '類型' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '短篇集' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: '每日播' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        await userEvent.click(screen.getByRole('button', { name: '每日播' }));
        expect(onChange).toHaveBeenCalledWith('daily');
    });
});
