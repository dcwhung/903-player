const CSS_TIME = /^([\d.]+)(ms|s)$/;
const MS_PER_SECOND = 1000;

/** 由 getComputedStyle 讀到嘅時長 token（`240ms` / `0.24s`）攞毫秒；其他當 0 */
export const cssMs = (value: string): number => {
    const match = CSS_TIME.exec(value.trim());
    if (!match) return 0;
    const amount = Number(match[1]);
    return match[2] === 's' ? amount * MS_PER_SECOND : amount;
};
