/*
 * 測試用嘅細 media query 計算：只識 app 用到嘅寫法——逗號分隔嘅清單、`and`、
 * orientation、min- / max-width、min- / max-height（px）。唔識嘅 feature 會 throw，唔會靜靜雞當 match。
 */
export interface ViewportSize {
    width: number;
    height: number;
}

const FEATURE = /^\(([a-z-]+): ([a-z0-9]+)\)$/;

const matchesFeature = (feature: string, { width, height }: ViewportSize): boolean => {
    const match = FEATURE.exec(feature.trim());
    if (!match) throw new Error(`唔識嘅 media feature：${feature}`);
    const [, name, value = ''] = match;
    if (name === 'orientation') {
        if (value !== 'landscape' && value !== 'portrait') throw new Error(`唔識：${feature}`);
        // CSS：闊 > 高先係 landscape，正方形當 portrait
        return (width > height ? 'landscape' : 'portrait') === value;
    }
    if (!value.endsWith('px')) throw new Error(`唔識嘅單位：${feature}`);
    const px = Number(value.slice(0, -2));
    if (name === 'min-width') return width >= px;
    if (name === 'max-width') return width <= px;
    if (name === 'min-height') return height >= px;
    if (name === 'max-height') return height <= px;
    throw new Error(`唔識嘅 media feature：${feature}`);
};

/** viewport 啱唔啱呢句 media query（逗號 = 或者） */
export const matchesQuery = (query: string, viewport: ViewportSize): boolean =>
    query
        .split(',')
        .some((part) => part.split(' and ').every((feature) => matchesFeature(feature, viewport)));
