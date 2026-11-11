/*
 * Roller 一條轆（時 / 分）：Design Origin: mockup: _mockups_/admin/index.html#s3（.wheel）
 * listbox：↑↓ / 滑鼠轆 / 撳一格揀；顯示揀中嗰格前後各 2 格（分鐘 00/15/30/45 循環）
 */
import type { KeyboardEvent, WheelEvent } from 'react';

const VISIBLE_EACH_SIDE = 2;

interface WheelProps {
    label: string;
    values: readonly string[];
    value: string;
    onChange: (value: string) => void;
    /** 分鐘轆：頭尾相連 */
    cyclic?: boolean;
}

const windowOf = (values: readonly string[], index: number, cyclic: boolean) =>
    Array.from({ length: VISIBLE_EACH_SIDE * 2 + 1 }, (_, i) => {
        const at = index - VISIBLE_EACH_SIDE + i;
        if (cyclic && values.length > VISIBLE_EACH_SIDE) {
            return values[(at + values.length * 2) % values.length];
        }
        return values[at];
    });

export function Wheel({ label, values, value, onChange, cyclic = false }: WheelProps) {
    const index = Math.max(0, values.indexOf(value));
    const step = (delta: number) => {
        const next = cyclic
            ? (index + delta + values.length) % values.length
            : Math.min(Math.max(index + delta, 0), values.length - 1);
        const picked = values[next];
        if (picked !== undefined && picked !== value) onChange(picked);
    };
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        step(event.key === 'ArrowUp' ? -1 : 1);
    };
    const onWheel = (event: WheelEvent) => step(event.deltaY > 0 ? 1 : -1);
    return (
        <ol
            className="wheel"
            role="listbox"
            aria-label={label}
            tabIndex={0}
            aria-activedescendant={`${label}-${value}`}
            onKeyDown={onKeyDown}
            onWheel={onWheel}
        >
            {windowOf(values, index, cyclic).map((item, i) => (
                <li
                    key={`${i}-${item ?? 'blank'}`}
                    id={item === value && i === VISIBLE_EACH_SIDE ? `${label}-${value}` : undefined}
                    role={item === undefined ? 'presentation' : 'option'}
                    aria-selected={item === undefined ? undefined : i === VISIBLE_EACH_SIDE}
                    className={i === VISIBLE_EACH_SIDE ? 'sel' : undefined}
                    onClick={() => item !== undefined && onChange(item)}
                >
                    {item ?? ' '}
                </li>
            ))}
        </ol>
    );
}
