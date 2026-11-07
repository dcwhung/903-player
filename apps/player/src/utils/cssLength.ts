/** tokens.css 放大過嘅尺寸：`calc(24px * 1.5)`（custom property 嘅 computed value 唔會將 calc 計好） */
const SCALED_PX = /^calc\(\s*([\d.]+)px\s*\*\s*([\d.]+)\s*\)$/;

/** 由 getComputedStyle 讀到嘅 custom property 攞 px：普通 px 或者 token 嘅 `calc(Npx * 倍數)`；其他當 0 */
export const cssPx = (value: string): number => {
    const text = value.trim();
    const scaled = SCALED_PX.exec(text);
    if (scaled) return Number(scaled[1]) * Number(scaled[2]);
    return text.startsWith('calc') ? 0 : parseFloat(text) || 0;
};
