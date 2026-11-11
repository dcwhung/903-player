/*
 * 上架（綠）/ 下架（紅）掣：Design Origin: mockup: _mockups_/admin/index.html#s3（.toggle）
 * role="switch"：讀屏讀「狀態，開關，已開啟」；畫面字 = 而家狀態
 */
import { t } from '../i18n/t';

interface ToggleProps {
    on: boolean;
    onChange: (on: boolean) => void;
    /** 欄位標籤 id（「狀態」） */
    labelledBy?: string;
    label?: string;
    disabled?: boolean;
}

export function Toggle({ on, onChange, labelledBy, label, disabled = false }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            className={`toggle ${on ? 'on' : 'off'}`}
            aria-checked={on}
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            disabled={disabled}
            onClick={() => onChange(!on)}
        >
            {on ? t('editor.on') : t('editor.off')}
        </button>
    );
}
