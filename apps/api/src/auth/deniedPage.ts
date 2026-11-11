/*
 * whitelist 外嘅 email：403 頁，唔開 session。
 * Design Origin: mockup: _mockups_/admin-style/index.html#g（同 admin 直向提示同一版式：
 * app banner（連 Admin pill）→ 插圖圓疊喺 banner 底 → 標題 → 一行說明 → 按鈕；書面語）。
 * 自己一個檔、樣式全部 inline（admin SPA 嘅 CSS 檔名有 hash，唔可以 link）。
 * Banner 用 admin 嘅 public 檔 `/banner.webp`：同一個 Worker 嘅 static assets 出（唔喺 run_worker_first），
 * 檔名固定唔帶 hash；字體同 admin 一樣由 Google Fonts 載（載唔到就用 system font）
 */
import { html, raw } from 'hono/html';
import pkg from '../../package.json';

/** apps/admin/public/banner.webp（1200×517） */
export const DENIED_BANNER_PATH = '/banner.webp';

/** 深色 token（跟系統，或者 admin 揀咗深色：data-theme="dark"） */
const DARK_TOKENS = `--bg: #0f1620; --surface: #1b2635; --ink: #e8eef5; --muted: #9aabbd;
  --soft: #1c3349; --art: #7cc2f0; --shadow: none; --border: #2c3b4f;`;

/**
 * 同 admin token 一致（apps/admin/src/styles/tokens.css）：預設跟系統深淺色；
 * admin 揀咗淺 / 深色（localStorage admin.theme，同 apps/admin/src/app/themePref.ts）就跟揀咗嘅
 */
const DENIED_STYLE = `
:root { color-scheme: light dark; --bg: #eef3f8; --surface: #fff; --ink: #16212e; --muted: #5e6b7a;
  --primary: #1e7bc0; --primary-hover: #155f96; --soft: #e6f3fc; --art: #1e7bc0; --shadow: 0 6px 20px rgb(30 70 120 / 0.08), 0 1px 3px rgb(30 70 120 / 0.06); --border: transparent; }
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ${DARK_TOKENS} } }
:root[data-theme='dark'] { color-scheme: dark; ${DARK_TOKENS} }
:root[data-theme='light'] { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 32px 20px; background: var(--bg); color: var(--ink);
  font: 15px/1.55 'Poppins', 'Noto Sans TC', 'PingFang HK', -apple-system, 'Segoe UI', sans-serif; }
.box { width: min(380px, 100%); padding: 32px 28px; border-radius: 24px; background: var(--surface); border: 1px solid var(--border);
  box-shadow: var(--shadow); text-align: center; display: grid; gap: 12px; justify-items: center; }
.banner { position: relative; width: calc(100% + 56px); margin: -32px -28px 0; border-radius: 24px 24px 0 0; overflow: hidden; }
.banner img { display: block; width: 100%; height: auto; }
.ver { position: absolute; right: 6px; bottom: 6px; padding: 0 8px; border-radius: 999px; background: #c2410c; color: #fff;
  font-size: 11px; font-weight: 600; line-height: 1.7; }
.art { position: relative; z-index: 1; width: 112px; height: 112px; margin: -54px 0 4px; display: grid; place-items: center;
  border: 6px solid var(--surface); border-radius: 50%; background: var(--soft); color: var(--art); }
.art svg, .btn svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }
.art svg { width: 60px; height: 60px; stroke-width: 2.4; }
h1 { margin: 0; font-size: 22px; font-weight: 600; }
p { margin: 0; color: var(--muted); font-size: 14px; }
code { font-family: inherit; color: var(--ink); font-weight: 500; overflow-wrap: anywhere; }
.btn { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 9px 18px; border-radius: 10px;
  background: var(--primary); color: #fff; font-weight: 500; font-size: 14px; text-decoration: none; box-shadow: 0 2px 6px rgb(30 123 192 / 0.3); }
.btn:hover { background: var(--primary-hover); }
.btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.btn svg { width: 18px; height: 18px; stroke-width: 2; }
`;

/** first paint 之前套用 admin 揀嘅淺 / 深色（讀唔到就跟系統） */
export const THEME_SCRIPT = `try { var theme = localStorage.getItem('admin.theme');
if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme); } catch (error) {}`;

/** lucide shield-x（插圖圓）+ log-in（按鈕） */
const SHIELD_X =
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5M9.5 9.5l5 5"/>';
const LOG_IN = '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>';

const FONTS =
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700&display=swap';

/** banner（連 Admin pill）+ 疊喺底嘅插圖圓 */
const BANNER = html`<div class="banner">
        <img src="${DENIED_BANNER_PATH}" alt="903 叱咤 Player" width="1200" height="517" /><span
            class="ver"
            >Admin v${pkg.version}</span
        >
    </div>
    <div class="art" aria-hidden="true"><svg viewBox="0 0 24 24">${raw(SHIELD_X)}</svg></div>`;

export const deniedPage = (email: string) =>
    html`<!doctype html>
        <html lang="zh-HK">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="noindex" />
                <title>沒有權限 · 903 Player Admin</title>
                <script>
                    ${raw(THEME_SCRIPT)};
                </script>
                <link rel="stylesheet" href="${FONTS}" />
                <style>
                    ${raw(DENIED_STYLE)}
                </style>
            </head>
            <body>
                <main class="box">
                    ${BANNER}
                    <h1>沒有權限</h1>
                    <p><code>${email}</code> 並非管理員。</p>
                    <a class="btn" href="/auth/google/start?select_account=1"
                        ><svg viewBox="0 0 24 24" aria-hidden="true">${raw(LOG_IN)}</svg>使用其他
                        Google 帳戶登入</a
                    >
                </main>
            </body>
        </html>`;
