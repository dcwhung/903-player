/** 包住 build-time global（同 appVersion.ts 一樣）；空字串 = 功能關住，production build 會成段剷走 */
export const CATALOG_URL: string = __CATALOG_URL__;
