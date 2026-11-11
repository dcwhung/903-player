/* 左右 switch（類型：短篇集 / 每日播）：Design Origin: mockup: _mockups_/admin/index.html#s4（.switch） */

interface SwitchOption<T extends string> {
    value: T;
    label: string;
}

interface SwitchProps<T extends string> {
    label: string;
    value: T;
    options: readonly SwitchOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    title?: string;
}

export function Switch<T extends string>({
    label,
    value,
    options,
    onChange,
    disabled = false,
    title,
}: SwitchProps<T>) {
    return (
        <div className="switch" role="group" aria-label={label} title={title}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
