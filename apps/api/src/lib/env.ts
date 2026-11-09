/* vars 讀取：逗號分隔 list（ADMIN_EMAILS、PLAYER_ORIGINS） */
export const csvList = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

/** email 唔分大小寫 */
export const isAdminEmail = (adminEmails: string, email: string): boolean =>
    csvList(adminEmails)
        .map((item) => item.toLowerCase())
        .includes(email.toLowerCase());
