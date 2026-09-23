import { next } from '@vercel/functions';

export const config = { matcher: '/((?!login-florals\\.png|robots\\.txt|favicon\\.ico).*)' };

const COOKIE = 'mh_auth';
const VIEW = 'mh_view';

async function token(pw) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mowgli-household:' + pw));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function page(error) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>You're invited</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&family=Jost:wght@300;400&family=Ms+Madi&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:#f8f1e5;color:#4a4038;font-family:Jost,sans-serif;font-weight:300;display:grid;place-items:center;padding:24px;overflow:hidden;position:relative}
img{position:absolute;left:0;top:-20px;height:115vh;mix-blend-mode:multiply;opacity:.95;pointer-events:none}
form{position:relative;display:flex;flex-direction:column;align-items:center;gap:28px;text-align:center;max-width:380px;width:100%}
h1{margin:0;font-family:'Cormorant Garamond',serif;font-weight:400;font-size:clamp(30px,5vw,42px);letter-spacing:.22em;line-height:1.1}
.f{display:flex;flex-direction:column;gap:6px;width:100%;text-align:left}
label{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#857a70}
input{font:inherit;font-size:16px;color:#4a4038;background:transparent;border:0;border-bottom:1px solid #c9c5be;padding:10px 0;outline:none;border-radius:0}
input:focus{border-bottom-color:#4a4038}
.e{font-size:13px;color:#a3563d;margin-top:4px}
button{font:inherit;font-size:12px;letter-spacing:.24em;text-transform:uppercase;background:#4a4038;color:#f8f1e5;border:0;padding:16px 40px;cursor:pointer}
button:hover{background:#332b25}
.s{font-family:'Ms Madi',cursive;font-size:26px;color:#857a70;line-height:1}
</style></head><body>
<img src="/login-florals.png" alt="">
<form method="POST" action="/__login">
<h1>YOU'RE INVITED</h1>
<div class="f"><label for="pw">Password</label><input id="pw" name="password" type="password" placeholder="From your invitation" autocomplete="off" autofocus required>${error ? '<div class="e">Not quite — check the invitation and try again.</div>' : ''}</div>
<button type="submit">Enter</button>
<div class="s">psst — it's on your invite</div>
</form></body></html>`;
  return new Response(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

export default async function middleware(req) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return new Response('Site password not configured.', { status: 503 });
  const url = new URL(req.url);
  const good = await token(pw);

  if (url.pathname === '/__login' && req.method === 'POST') {
    const form = await req.formData();
    const tried = String(form.get('password') || '').trim();
    if (tried === pw.trim()) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/', 'Set-Cookie': `${COOKIE}=${good}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60` },
      });
    }
    await new Promise(r => setTimeout(r, 1500));
    return page(true);
  }

  const jar = (req.headers.get('cookie') || '').split(/;\s*/);
  const get = name => jar.find(c => c.startsWith(name + '='))?.slice(name.length + 1);
  const isPage = url.pathname === '/' || url.pathname === '/index.html';
  if (isPage) {
    // one-time pass: consumed on each page load, so every visit asks again
    if (get(COOKIE) !== good) return page(false);
    const h = new Headers({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
    h.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    h.append('Set-Cookie', `${VIEW}=${good}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`);
    return next({ headers: h });
  }
  // sub-resources (map) ride on the short view pass set by the page load
  if (get(VIEW) === good || get(COOKIE) === good) return next({ headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  return page(false);
}
