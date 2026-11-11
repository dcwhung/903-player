/*
 * whitelist 外嘅 email：403 頁（_mockups_/admin-ops ②），唔開 session。
 * 樣式 inline（ops 頁 public/ 已退役；admin SPA 嘅 CSS 檔名有 hash，唔可以 link）
 */
import { html, raw } from 'hono/html';

/** 同 admin token 一致（apps/admin/src/styles/tokens.css），跟系統深淺色 */
const DENIED_STYLE = `
:root { color-scheme: light dark; --bg: #f4f5f7; --surface: #fff; --ink: #18202b; --line: #d3d9e2; --accent: #2f5fa7; }
@media (prefers-color-scheme: dark) { :root { --bg: #12161c; --surface: #1c222b; --ink: #e6e9ee; --line: #2e3742; --accent: #7aa7e8; } }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: var(--bg); color: var(--ink);
  font: 15px/1.5 -apple-system, 'PingFang HK', 'Noto Sans TC', 'Segoe UI', sans-serif; }
.card { max-width: 340px; margin: 16px; padding: 24px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); text-align: center; }
.btn { display: inline-block; margin-top: 8px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; color: var(--accent); text-decoration: none; }
`;

export const deniedPage = (email: string) =>
    html`<!doctype html>
        <html lang="zh-HK">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>冇權限 · 903 Player Admin</title>
                <style>
                    ${raw(DENIED_STYLE)}
                </style>
            </head>
            <body>
                <main class="page">
                    <div class="card center">
                        <h2>冇權限</h2>
                        <p class="lead"><code>${email}</code> 唔係管理員。</p>
                        <a class="btn" href="/auth/google/start?select_account=1"
                            >用其他 Google 帳戶登入</a
                        >
                    </div>
                </main>
            </body>
        </html>`;
