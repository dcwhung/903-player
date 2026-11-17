/*
 * 分段 tabs / 切換掣（用戶 2026-11-17）：膠囊軌道 + 一粒共用嘅揀中膠囊，換選項時膠囊滑過去（減少動態就直接換）。
 * mode="tabs"：tablist / tab（aria-selected、aria-controls、roving tabIndex），例如排程「編輯｜預覽」；
 * mode="toggle"：group + aria-pressed 掣，例如劇集類型、App 圖示裝置。兩個模式都有 ←→ / Home / End。
 * disabled：成組停用，冇一個顯示揀中（冇膠囊、aria-pressed / aria-selected 全部 false）。
 * Design Origin: ScheduleBars「編輯｜預覽」.view-tabs / .view-pill（用戶 2026-11-12）
 */
import type { LucideIcon } from 'lucide-react';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
    nextSegmentIndex,
    segmentTabId,
    slideDirection,
    type SegmentDirection,
} from './segmentedTabsModel';

export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    /** 字左邊嘅 outline icon（aria-hidden） */
    icon?: LucideIcon;
}

interface SegmentedTabsProps<T extends string> {
    options: readonly SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** 成組嘅 aria-label */
    label: string;
    mode: 'tabs' | 'toggle';
    disabled?: boolean | undefined;
    /** tabs 模式控制嘅 tabpanel id；tab id = segmentTabId(panelId, value) */
    panelId?: string;
    className?: string;
}

/** 記住上一格，計膠囊滑動方向（render 期間按 props 更新 state，React 建議做法） */
function useSlideDirection(index: number): SegmentDirection {
    const [slide, setSlide] = useState({ index, direction: 'forward' as SegmentDirection });
    if (slide.index === index) return slide.direction;
    const next = { index, direction: slideDirection(slide.index, index) };
    setSlide(next);
    return next.direction;
}

interface SegmentButtonProps<T extends string> {
    option: SegmentedOption<T>;
    chosen: boolean;
    isTabs: boolean;
    panelId: string | undefined;
    disabled: boolean;
    onChange: (value: T) => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/** 一格：tabs 模式 = role="tab" + roving tabIndex；toggle 模式 = aria-pressed 掣 */
function SegmentButton<T extends string>(props: SegmentButtonProps<T>) {
    const { option, chosen, isTabs, panelId } = props;
    const Icon = option.icon;
    const semantics = isTabs
        ? {
              id: panelId ? segmentTabId(panelId, option.value) : undefined,
              role: 'tab',
              'aria-selected': chosen,
              'aria-controls': panelId,
              tabIndex: chosen ? 0 : -1,
          }
        : { 'aria-pressed': chosen };
    return (
        <button
            type="button"
            {...semantics}
            disabled={props.disabled}
            onClick={() => props.onChange(option.value)}
            onKeyDown={props.onKeyDown}
        >
            {Icon && <Icon aria-hidden="true" />}
            {option.label}
        </button>
    );
}

export function SegmentedTabs<T extends string>(props: SegmentedTabsProps<T>) {
    const { options, value, onChange, label, mode, disabled = false, panelId } = props;
    const groupRef = useRef<HTMLDivElement>(null);
    const index = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );
    const direction = useSlideDirection(index);
    const isTabs = mode === 'tabs';
    // 由 focus 嗰格起計（W-780）：toggle 模式每粒掣都可以 Tab 到，focus 未必喺揀中格
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const buttons = [...(groupRef.current?.querySelectorAll('button') ?? [])];
        const from = Math.max(0, buttons.indexOf(event.currentTarget));
        const target = nextSegmentIndex(event.key, from, options.length);
        const option = target === null ? undefined : options[target];
        if (disabled || target === null || !option) return;
        event.preventDefault();
        onChange(option.value);
        buttons[target]?.focus();
    };
    const style = { '--seg-index': String(index), '--seg-count': String(options.length) };
    return (
        <div
            ref={groupRef}
            className={['seg-tabs', props.className].filter(Boolean).join(' ')}
            role={isTabs ? 'tablist' : 'group'}
            aria-label={label}
            style={style as CSSProperties}
        >
            {!disabled && (
                <span className="seg-tabs-pill" data-direction={direction} aria-hidden="true" />
            )}
            {options.map((option) => (
                <SegmentButton
                    key={option.value}
                    option={option}
                    chosen={!disabled && option.value === value}
                    isTabs={isTabs}
                    panelId={panelId}
                    disabled={disabled}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
            ))}
        </div>
    );
}
