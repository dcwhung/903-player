/* 圖檔名（<hash>.<ext>，IMAGE_FILE_PATTERN）嘅 helper：publish 同 banner 驗「已上載」共用（S-905） */

const EXTENSION_SEPARATOR = '.';

/** 圖檔名 → hash（第一個 . 之前；冇 . 就成個名） */
export const hashOfImageName = (name: string): string => name.split(EXTENSION_SEPARATOR)[0] ?? '';
