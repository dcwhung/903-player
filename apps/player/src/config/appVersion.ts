import { t } from '../i18n/t';

/** 包住 build-time global，等其他 module 同測試唔使直接掂 __APP_VERSION__ */
export const APP_VERSION: string = __APP_VERSION__;

export const formatAppVersion = (version: string): string => t('app.version', { version });
