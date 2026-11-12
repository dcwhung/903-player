/*
 * 自訂日期欄（用戶 2026-11-12，取代 <input type="date">）：一律顯示 DD/MM/YYYY（唔跟瀏覽器語系），
 * 值入出都係 ISO YYYY-MM-DD。可以直接打 DD/MM/YYYY（useDateText），或者撳日曆 icon 開月曆（DateCalendar）；
 * 撳月曆以外 / Esc 收起，Esc 同揀咗都 focus 返日曆掣
 */
import { Calendar } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { t } from '../i18n/t';
import { DateCalendar } from './DateCalendar';
import { useDateText, type DateLimits } from './useDateText';
import { useOutsidePointer } from './useOutsidePointer';

export interface DateFieldProps extends DateLimits {
    /** 讀屏名（日曆掣 =「選擇⟨label⟩」） */
    label: string;
    /** ISO YYYY-MM-DD；'' = 未填（非必填先可以） */
    value: string;
    onChange: (iso: string) => void;
    /** 句子入面（.sentence）嘅細款；否則係表單欄 */
    inline?: boolean;
}

/** DD/MM/YYYY 文字欄 + 錯誤字：離開欄位 / Enter 先驗證 */
function DateInput({
    label,
    inline,
    text,
    error,
    errorId,
    onType,
    onCheck,
}: {
    label: string;
    inline: boolean;
    text: string;
    error: string | null;
    errorId: string;
    onType: (text: string) => void;
    onCheck: () => void;
}) {
    return (
        <>
            <input
                type="text"
                className={inline ? 'inline-ctl' : undefined}
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('dateField.placeholder')}
                aria-label={label}
                aria-invalid={error !== null || undefined}
                aria-describedby={error === null ? undefined : errorId}
                value={text}
                onChange={(event) => onType(event.target.value)}
                onBlur={onCheck}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    onCheck();
                }}
            />
            {error !== null && (
                <span id={errorId} className="date-error">
                    {error}
                </span>
            )}
        </>
    );
}

export function DateField({ label, value, onChange, inline = false, ...limits }: DateFieldProps) {
    const { text, error, type, check, accept } = useDateText(value, onChange, limits);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const errorId = useId();
    useOutsidePointer(rootRef, open, () => setOpen(false));
    const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };
    return (
        <span ref={rootRef} className={`date-field${inline ? ' inline' : ''}`}>
            <DateInput
                label={label}
                inline={inline}
                text={text}
                error={error}
                errorId={errorId}
                onType={type}
                onCheck={check}
            />
            <button
                ref={triggerRef}
                type="button"
                className="date-trigger"
                aria-label={t('dateField.open', { label })}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <Calendar aria-hidden="true" />
            </button>
            {open && (
                <DateCalendar
                    label={label}
                    value={value}
                    {...limits}
                    onPick={(iso) => {
                        accept(iso);
                        close();
                    }}
                    onClose={close}
                />
            )}
        </span>
    );
}
