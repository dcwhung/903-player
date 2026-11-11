/*
 * Login 掣嘅連結（S-809）：深連結（例如 /dramas/x/schedule#arc）放入 ?next=，server login 完轉返去。
 * 只送同源相對路徑：一定 / 開頭、唔係 //（protocol-relative）、冇 \ 同控制字元、唔係 /auth/*（避免轉返 login）。
 * Server 都要用同一套規則再驗一次（呢度只係唔送怪值）
 */
const START = '/auth/google/start';

interface Where {
    pathname: string;
    search: string;
    hash: string;
}

/** ASCII 控制字元（< 0x20、DEL）：換行等可以拆 header / 騙 URL parser */
const FIRST_PRINTABLE = 0x20;
const DEL = 0x7f;
const hasControlChar = (text: string) =>
    [...text].some((char) => {
        const code = char.charCodeAt(0);
        return code < FIRST_PRINTABLE || code === DEL;
    });

const isSafeNext = (path: string): boolean =>
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !hasControlChar(path) &&
    !path.startsWith('/auth/');

export const loginHref = ({ pathname, search, hash }: Where): string => {
    const next = `${pathname}${search}${hash}`;
    if (next === '/' || !isSafeNext(next)) return START;
    return `${START}?${new URLSearchParams({ next }).toString()}`;
};
