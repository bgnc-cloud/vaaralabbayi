/* ═══════════════════════════════════════════════════
   VIPL Internal — Shared App Shell
   Handles: auth, sidebar, role-based navigation
   Every page includes this file + has empty containers:
   <div id="authBox"></div>  <div id="appShell"></div>
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://uylkgldmyyvtxxsmkquy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bGtnbGRteXl2dHh4c21rcXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjA2MzgsImV4cCI6MjEwMDE5NjYzOH0.UQTA1S7_foALSPHBdQbwSVRp50pGTcGAyiyyaB4EjsI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── NAV CONFIG ──────────────────────────────────────
// roles: 'all' or an array of role names allowed to see this item.
// Add new items here as modules get built — every page picks it up automatically.
const NAV_CONFIG = [
  { group: 'General', items: [
    { label: '🏠 Overview', href: 'index.html', roles: 'all' },
  ]},
  { group: 'Finance', items: [
    { label: '📒 Ledger Entry', href: 'ledger.html', roles: ['super_admin','accountant','entry'] },
    { label: '📊 Financial Dashboard', href: 'dashboard.html', roles: ['super_admin','accountant'] },
  ]},
  { group: 'Operations', items: [
    { label: '🏪 Stores', href: null, roles: ['super_admin','store_operator'], soon: true },
    { label: '📈 Investor Portal', href: 'investor-portal.html', roles: ['super_admin','accountant','investor'] },
    { label: '👥 Subscribers', href: null, roles: ['super_admin','subscriber'], soon: true },
    { label: '🚚 Supply Chain', href: null, roles: ['super_admin','fbc_rm','fbc_bdm','fbc_mm'], soon: true },
  ]},
  { group: 'Admin', items: [
    { label: '👤 User Management', href: null, roles: ['super_admin'], soon: true },
  ]},
];

const ROLE_LABELS = {
  super_admin: 'Super Admin', accountant: 'Accountant', entry: 'Entry Staff',
  store_operator: 'Store Operator', fbc_rm: 'FBC — RM', fbc_bdm: 'FBC — BDM',
  fbc_mm: 'FBC — MM', investor: 'Investor', subscriber: 'Subscriber', viewer: 'Viewer'
};

// ── SHELL STATE ─────────────────────────────────────
window.VIPL = { sb, user: null, profile: null };
const currentPage = location.pathname.split('/').pop() || 'index.html';

function injectShellStyles() {
  const style = document.createElement('style');
  style.textContent = `
    body { background: var(--off); margin: 0; }
    #authBox { max-width: 400px; margin: 80px auto; background: #fff; border-radius: 16px; padding: 36px; box-shadow: 0 20px 50px rgba(13,35,64,.12); }
    #authBox h1 { font-family:'Plus Jakarta Sans',sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 6px; }
    #authBox p { font-size: 13.5px; color: var(--g3); margin-bottom: 20px; }
    #authBox input { width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; font-size: 14px; }
    #authBox button { width: 100%; padding: 12px; border-radius: 8px; background: var(--blue); color: #fff; border: none; font-weight: 700; cursor: pointer; font-size: 14px; }
    #authMsg { font-size: 13px; margin-top: 10px; text-align: center; }
    #appShell { display: none; }
    #sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 230px; background: var(--navy); color: #fff; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; z-index: 10; }
    #sidebar .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding: 0 8px; }
    #sidebar .brand img { height: 30px; filter: brightness(10); }
    #sidebar .brand span { font-family:'Plus Jakarta Sans',sans-serif; font-weight: 800; font-size: 15px; }
    #roleBadge { font-size: 11px; font-weight: 700; background: rgba(249,115,22,.2); color: #F97316; padding: 4px 10px; border-radius: 6px; margin: 0 8px 20px; display: inline-block; }
    .navGroup { margin-bottom: 22px; }
    .navGroupLbl { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.4); padding: 0 8px; margin-bottom: 8px; }
    .navLink { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 8px; color: rgba(255,255,255,.8); text-decoration: none; font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .navLink:hover { background: rgba(255,255,255,.06); color: #fff; }
    .navLink.active { background: var(--blue); color: #fff; }
    .navLink.soon { color: rgba(255,255,255,.3); cursor: default; }
    .navLink .tag { margin-left: auto; font-size: 9px; background: rgba(255,255,255,.1); padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }
    #sidebarFooter { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.1); }
    #sidebarFooter .userEmail { font-size: 12px; color: rgba(255,255,255,.5); padding: 0 8px; margin-bottom: 10px; word-break: break-all; }
    #signOutBtn { width: 100%; background: rgba(255,255,255,.08); border: none; border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    #mainArea { margin-left: 230px; padding: 32px 40px; max-width: 1100px; }
    #mainArea h1.pageTitle { font-family:'Plus Jakarta Sans',sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 20px; }
    @media (max-width: 768px) {
      #sidebar { width: 100%; height: auto; position: relative; flex-direction: row; overflow-x: auto; }
      #mainArea { margin-left: 0; padding: 24px 16px; }
      #sidebar .brand, #sidebarFooter, .navGroupLbl, #roleBadge { display: none; }
      .navGroup { display: flex; margin-bottom: 0; }
    }
  `;
  document.head.appendChild(style);
}

function renderAuthBox() {
  const box = document.getElementById('authBox');
  if (!box) return;
  box.innerHTML = `
    <h1>VIPL Internal</h1>
    <p>Sign in with your team account to continue.</p>
    <input type="email" id="authEmail" placeholder="Email address">
    <input type="password" id="authPass" placeholder="Password">
    <button id="signInBtn">Sign In</button>
    <div id="authMsg"></div>
  `;
  document.getElementById('signInBtn').onclick = signIn;
}

function renderSidebar() {
  const role = window.VIPL.profile ? window.VIPL.profile.role : 'viewer';
  let html = `
    <div class="brand"><img src="../logo.jpg" alt=""><span>VIPL Internal</span></div>
    <div id="roleBadge">${ROLE_LABELS[role] || role}</div>
  `;
  NAV_CONFIG.forEach(group => {
    const visibleItems = group.items.filter(item => item.roles === 'all' || item.roles.includes(role));
    if (!visibleItems.length) return;
    html += `<div class="navGroup"><div class="navGroupLbl">${group.group}</div>`;
    visibleItems.forEach(item => {
      if (item.soon || !item.href) {
        html += `<a class="navLink soon">${item.label} <span class="tag">Soon</span></a>`;
      } else {
        const activeClass = currentPage === item.href ? ' active' : '';
        html += `<a class="navLink${activeClass}" href="${item.href}">${item.label}</a>`;
      }
    });
    html += `</div>`;
  });
  html += `
    <div id="sidebarFooter">
      <div class="userEmail">${window.VIPL.user ? window.VIPL.user.email : ''}</div>
      <button id="signOutBtn">Sign Out</button>
    </div>
  `;
  document.getElementById('sidebar').innerHTML = html;
  document.getElementById('signOutBtn').onclick = signOut;
}

async function signIn() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPass').value;
  const msg = document.getElementById('authMsg');
  msg.style.color = 'var(--g3)'; msg.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { msg.style.color = '#C0392B'; msg.textContent = error.message; return; }
  await bootstrap();
}

async function signOut() {
  await sb.auth.signOut();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authBox').style.display = 'block';
}

async function bootstrap() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  window.VIPL.user = user;

  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  window.VIPL.profile = profile;

  document.getElementById('authBox').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  renderSidebar();

  if (typeof window.onVIPLReady === 'function') window.onVIPLReady();
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  injectShellStyles();
  renderAuthBox();
  const { data: { session } } = await sb.auth.getSession();
  if (session) await bootstrap();
});
