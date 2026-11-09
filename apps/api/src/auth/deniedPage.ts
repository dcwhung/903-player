/* whitelist 外嘅 email：403 頁（_mockups_/admin-ops ②），唔開 session；樣式同 ops 頁共用 /ops.css */
import { html } from 'hono/html';

export const deniedPage = (email: string) =>
    html`<!doctype html>
        <html lang="zh-HK">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>冇權限 · 903 Player Ops</title>
                <link rel="stylesheet" href="/ops.css" />
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
