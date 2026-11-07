/*
 * 廣播劇錄音檔名工具：由 drama.json 嘅 template 砌出 R2 檔名，同集名 / 中文數字 / URL 編碼。
 */

/** 路徑每一段都 encode（空格、中文、全形字） */
export const encodePath = (segments: readonly string[]): string =>
    segments.map(encodeURIComponent).join('/');

/** 檔名入面嘅集數用中文數字（第零集、第一集 … 第十集 … 第三十六集） */
const CHINESE_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
const CHINESE_ZERO = '零';
const CHINESE_TEN = '十';
const TEN = 10;

/** 0–99 → 中文數字（0 →「零」、10 →「十」、12 →「十二」、20 →「二十」、36 →「三十六」） */
export const toChineseNumeral = (n: number): string => {
    if (n === 0) return CHINESE_ZERO;
    const tens = Math.floor(n / TEN);
    const ones = n % TEN;
    if (tens === 0) return CHINESE_DIGITS[ones] ?? String(n);
    const tensPart = tens === 1 ? CHINESE_TEN : `${CHINESE_DIGITS[tens] ?? ''}${CHINESE_TEN}`;
    return `${tensPart}${CHINESE_DIGITS[ones] ?? ''}`;
};

/** 檔名入面集名「計名 _ 副題」嘅分隔（檔名唔用得「：」），畫面顯示換返做「：」 */
const FILE_TITLE_SEPARATOR = ' _ ';
const DISPLAY_TITLE_SEPARATOR = '：';

/** 畫面顯示嘅集名：分隔換「：」，去頭尾空格 */
export const displayTitle = (fileTitle: string): string =>
    fileTitle.replaceAll(FILE_TITLE_SEPARATOR, DISPLAY_TITLE_SEPARATOR).trim();

/** template 入面嘅 token：{no2}、{arc}… */
const TOKEN_PATTERN = /\{(\w+)\}/g;
/** 一次過掃 optional group（[ - {title}]）同 token，token 值唔會再被展開 */
const GROUP_OR_TOKEN_PATTERN = /\[([^\]]*)\]|\{(\w+)\}/g;

export type FileNameTokens = Readonly<Record<string, string>>;

const lookupToken = (tokens: FileNameTokens, name: string): string => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`unknown token {${name}}`);
    return value;
};

const renderGroup = (group: string, tokens: FileNameTokens): string => {
    let dropped = false;
    const rendered = group.replace(TOKEN_PATTERN, (_, name: string) => {
        const value = lookupToken(tokens, name);
        if (value === '') dropped = true;
        return value;
    });
    return dropped ? '' : rendered;
};

/**
 * 由 template 砌檔名：`{token}` 換值，`[ … ]` 係 optional group（入面 token 空值就略去成段）。
 * 未知 token 會 throw（schema 層先驗，呢度係最後防線）。token 值本身唔會再展開。
 */
export const renderFileName = (template: string, tokens: FileNameTokens): string =>
    template.replace(
        GROUP_OR_TOKEN_PATTERN,
        (_, group: string | undefined, name: string | undefined) =>
            group === undefined ? lookupToken(tokens, name ?? '') : renderGroup(group, tokens),
    );
