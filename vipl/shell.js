/* ═══════════════════════════════════════════════════
   VIPL Internal — Shared App Shell
   Handles: auth, sidebar (desktop), bottom nav (mobile), role-based navigation
   Every page includes this file + has empty containers:
   <div id="authBox"></div>  <div id="appShell"></div>
═══════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://uylkgldmyyvtxxsmkquy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bGtnbGRteXl2dHh4c21rcXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjA2MzgsImV4cCI6MjEwMDE5NjYzOH0.UQTA1S7_foALSPHBdQbwSVRp50pGTcGAyiyyaB4EjsI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── NAV CONFIG ──────────────────────────────────────
const NAV_CONFIG = [
  { group: 'General', items: [
    { label: '🏠 Overview', href: 'index.html', roles: 'all' },
  ]},
  { group: 'Command Center', items: [
    { label: '🖥️ Health Monitor', href: 'command-center.html', roles: ['super_admin'] },
    { label: '📋 Audit Feed', href: 'audit-feed.html', roles: ['super_admin', 'admin'] },
  ]},
  { group: 'Finance', items: [
    { label: '📒 Ledger Entry', href: 'ledger.html', roles: ['super_admin','accountant','entry','auditor_team'] },
    { label: '📊 Financial Dashboard', href: 'dashboard.html', roles: ['super_admin','accountant','auditor_team'] },
    { label: '💳 Loan Portal', href: 'loan-portal.html', roles: ['super_admin','accountant','investor','director_1','director_2','auditor_team'] },
    { label: '🧾 Statements', href: 'statements.html', roles: ['super_admin','accountant','investor','director_1','director_2','auditor_team'] },
    { label: '🧮 GST / Audit', href: 'gst-audit.html', roles: ['super_admin','accountant','auditor_team'] },
    { label: '📄 Invoices', href: 'invoices.html', roles: ['super_admin','accountant','auditor_team'] },
    { label: '💰 Payment Receipts', href: 'receipts.html', roles: ['super_admin','accountant','auditor_team'] },
  ]},
  { group: 'Operations', items: [
    { label: '🏪 Stores', href: null, roles: ['super_admin','store_operator'], soon: true },
    { label: '📈 Investor Portal', href: 'investor-portal.html', roles: ['super_admin','accountant','investor','director_1','director_2','auditor_team'] },
    { label: '🏦 Director Share', href: 'director-share.html', roles: ['super_admin','accountant','director_1','director_2','auditor_team'] },
    { label: '👥 Subscribers', href: null, roles: ['super_admin','subscriber'], soon: true },
    { label: '🚚 Supply Chain', href: 'warehouse-management.html', roles: ['super_admin','admin','hr_manager','investor','director_1','director_2'] },
  ]},
  { group: 'Admin', items: [
    { label: '🧩 Role Management', href: 'roles.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '👤 Employee Management', href: 'employees.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '🗺️ FBC — All States', href: 'fbc-states.html', roles: ['super_admin','admin','hr_manager','investor','director_1','director_2'] },
    { label: '📊 FBC Dashboard', href: 'fbc-dashboard.html', roles: ['super_admin','admin','hr_manager','investor','director_1','director_2'] },
    { label: '📊 CRM Dashboard', href: 'fbc-crm-dashboard.html', roles: ['super_admin','admin','hr_manager','investor','director_1','director_2'] },
    { label: '📇 Leads CRM', href: 'leads-crm.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '🧾 Subscriber Workflow', href: 'subscribers-crm.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '🚜 FBC Employees', href: 'fbc-employees.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '🛡️ FBC Admin Team', href: 'fbc-admin-team.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '🔗 Party Tagging', href: 'party-tagging.html', roles: ['super_admin','accountant'] },
    { label: '👥 People & Roles', href: 'people-overview.html', roles: ['super_admin','accountant'] },
  ]},
];

const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Admin', hr_manager: 'HR Manager',
  director_1: 'Director', director_2: 'Director',
  accountant: 'Accountant', entry: 'Entry Staff',
  store_operator: 'Store Operator', fbc_rm: 'FBC — RM', fbc_bdm: 'FBC — BDM',
  fbc_mm: 'FBC — MM', investor: 'Investor', subscriber: 'Subscriber', viewer: 'Viewer',
  auditor_team: 'Auditor Team',
  pending: 'Pending Approval'
};

const REQUESTED_ROLE_OPTIONS = [
  { value: '', label: 'What access do you need?' },
  { value: 'investor', label: 'Investor — view my stake & loan exposure' },
  { value: 'accountant', label: 'Accountant / Bookkeeper' },
  { value: 'entry', label: 'Ledger Entry Staff' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'other', label: 'Other / Not sure' },
];

// ── SHELL STATE ─────────────────────────────────────
window.VIPL = { sb, user: null, profile: null };
const currentPage = location.pathname.split('/').pop() || 'index.html';
let authMode = 'signin'; // signin | signup | forgot | reset

function injectShellStyles() {
  const style = document.createElement('style');
  style.textContent = `
    body { background: var(--off); margin: 0; }
    #authBox { max-width: 420px; margin: 50px auto; background: #fff; border-radius: 16px; padding: 36px; box-shadow: 0 20px 50px rgba(13,35,64,.12); }
    #authBox h1 { font-family:'Plus Jakarta Sans',sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 6px; }
    #authBox p { font-size: 13.5px; color: var(--g3); margin-bottom: 20px; }
    #authBox input, #authBox select { width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; font-size: 14px; font-family: inherit; background: #fff; }
    #authBox button { width: 100%; padding: 12px; border-radius: 8px; background: var(--blue); color: #fff; border: none; font-weight: 700; cursor: pointer; font-size: 14px; }
    #authMsg { font-size: 13px; margin-top: 10px; text-align: center; }
    .authSwitch { font-size: 13px; text-align: center; margin-top: 16px; color: var(--g3); }
    .authSwitch a { color: var(--blue); font-weight: 700; text-decoration: none; cursor: pointer; }
    .forgotLink { font-size: 12.5px; text-align: right; margin: -4px 0 14px; }
    .forgotLink a { color: var(--blue); text-decoration: none; cursor: pointer; font-weight: 600; }
    .pwWrap { position: relative; margin-bottom: 10px; }
    .pwWrap input { margin-bottom: 0; padding-right: 56px; }
    .pwToggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 700; color: var(--blue); cursor: pointer; user-select: none; }
    .customerIdBox { font-size: 22px; font-weight: 800; text-align: center; background: var(--off); border-radius: 8px; padding: 16px; margin-bottom: 16px; color: var(--blue); letter-spacing: .03em; }
    .backToSite {
      display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700;
      color: var(--g3); text-decoration: none; margin-bottom: 18px;
    }
    .backToSite:hover { color: var(--blue); }
    #appShell { display: none; }

    /* ── Desktop sidebar ── */
    #sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 230px; box-sizing: border-box; background: var(--navy); color: #fff; padding: 22px 14px 18px; overflow-y: auto; display: flex; flex-direction: column; z-index: 10; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.18) transparent; }
    #sidebar .brand { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin: 0 0 14px; padding: 0 8px; text-decoration: none; color: #fff; border-radius: 12px; }
    #sidebar .brand .logoTile { background: #fff; border-radius: 12px; padding: 10px; box-shadow: 0 6px 16px rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.2); line-height: 0; }
    #sidebar .brand img { width: 150px; height: auto; display: block; }
    #sidebar .brand .brandSub { font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.5); padding-left: 2px; }
    #roleBadge { align-self: flex-start; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; background: rgba(249,115,22,.14); color: #FDBA74; border: 1px solid rgba(249,115,22,.28); padding: 4px 10px; border-radius: 999px; margin: 0 8px 18px; line-height: 1.3; }
    .navGroup { margin-bottom: 16px; }
    .navGroupLbl { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.36); padding: 0 10px; margin-bottom: 6px; }
    .navLink { position: relative; display: flex; align-items: center; gap: 11px; padding: 8px 10px; border-radius: 8px; color: rgba(255,255,255,.72); text-decoration: none; font-size: 13.5px; font-weight: 600; line-height: 1.3; margin-bottom: 1px; transition: background .15s, color .15s; }
    .navLink .navIcon { width: 18px; height: 18px; flex-shrink: 0; opacity: .85; }
    .navLink:hover { background: rgba(255,255,255,.07); color: #fff; }
    .navLink:hover .navIcon { opacity: 1; }
    .navLink.active { background: rgba(66,165,245,.18); color: #fff; }
    .navLink.active .navIcon { opacity: 1; color: #90CAF9; }
    .navLink.active::before { content: ''; position: absolute; left: -14px; top: 6px; bottom: 6px; width: 3px; border-radius: 0 3px 3px 0; background: #42A5F5; }
    .navLink.soon { color: rgba(255,255,255,.32); cursor: default; }
    .navLink.soon:hover { background: none; color: rgba(255,255,255,.32); }
    .navLink .tag { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: .06em; background: rgba(255,255,255,.08); color: rgba(255,255,255,.5); padding: 2px 6px; border-radius: 999px; text-transform: uppercase; }
    #sidebar a:focus-visible, #sidebar button:focus-visible { outline: 2px solid #90CAF9; outline-offset: 2px; }
    #sidebarFooter { margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.09); }
    .userBlock { display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 10px; background: rgba(255,255,255,.05); border-radius: 10px; }
    .userAvatar { width: 30px; height: 30px; border-radius: 50%; background: rgba(66,165,245,.22); color: #BBDEFB; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .userMeta { min-width: 0; }
    #sidebarFooter .userEmail { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.82); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #sidebarFooter .userCustomerId { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 1px; font-variant-numeric: tabular-nums; }
    .sideBtn {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box;
      background: transparent; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; padding: 8px 10px;
      color: rgba(255,255,255,.82); font: inherit; font-size: 12.5px; font-weight: 700; text-decoration: none; cursor: pointer;
      margin-bottom: 6px; transition: background .15s, border-color .15s, color .15s;
    }
    .sideBtn svg { width: 16px; height: 16px; flex-shrink: 0; }
    .sideBtn:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.24); color: #fff; }
    #signOutBtn { margin-bottom: 0; color: #FCA5A5; border-color: rgba(252,165,165,.22); }
    #signOutBtn:hover { background: rgba(239,68,68,.12); border-color: rgba(252,165,165,.4); color: #FECACA; }
    #mainArea { margin-left: 230px; padding: 32px 40px; max-width: 1100px; }
    #mainArea h1.pageTitle { font-family:'Plus Jakarta Sans',sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 20px; }
    .pendingBox { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 40px; text-align: center; max-width: 480px; margin: 40px auto; }
    .pendingBox .emoji { font-size: 40px; margin-bottom: 12px; }
    .pendingBox h2 { font-family:'Plus Jakarta Sans',sans-serif; font-size: 19px; font-weight: 800; margin-bottom: 8px; }
    .pendingBox p { font-size: 13.5px; color: var(--g3); line-height: 1.5; }
    .pendingBox .idTag { display: inline-block; font-weight: 800; color: var(--blue); background: var(--off); padding: 4px 10px; border-radius: 6px; margin: 8px 0 16px; }

    /* ── Mobile bottom tab bar ── */
    #bottomNav { display: none; }
    #moreSheetBackdrop { display: none; }
    #moreSheet { display: none; }

    @media (max-width: 768px) {
      #appShell { flex-direction: column; }
      #sidebar { display: none; }
      #mainArea { margin-left: 0; padding: 20px 16px 88px; }

      #bottomNav {
        display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
        background: #fff; border-top: 1px solid var(--border);
        padding: 6px 2px calc(6px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -6px 20px rgba(13,35,64,.06);
      }
      .bnItem {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
        padding: 7px 2px 5px; border-radius: 12px; text-decoration: none; color: var(--g3);
        font-size: 10.5px; font-weight: 600; border: none; background: none; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .bnItem .bnIcon { font-size: 19px; line-height: 1; display: flex; }
      .bnItem .bnIcon svg { width: 20px; height: 20px; }
      .bnItem.active { color: var(--blue); font-weight: 800; }
      .bnItem:focus-visible, .sheetLink:focus-visible, #moreSheet button:focus-visible, #moreSheet a:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

      #moreSheetBackdrop.open {
        display: block; position: fixed; inset: 0; background: rgba(11,29,46,.42); z-index: 40;
      }
      #moreSheet {
        display: block; position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
        border-radius: 18px 18px 0 0; z-index: 41; padding: 10px 8px calc(18px + env(safe-area-inset-bottom, 0px));
        max-height: 72vh; overflow-y: auto; transform: translateY(100%); transition: transform .25s ease;
      }
      #moreSheet.open { transform: translateY(0); }
      .sheetHandle { width: 36px; height: 4px; background: var(--border); border-radius: 3px; margin: 6px auto 14px; }
      .sheetGroupLbl { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(16,24,40,.4); padding: 4px 14px; margin-top: 8px; }
      .sheetLink {
        display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 10px;
        color: var(--ink); text-decoration: none; font-size: 14.5px; font-weight: 600;
      }
      .sheetLink:active { background: var(--off); }
      .sheetLink .navIcon { width: 18px; height: 18px; flex-shrink: 0; color: var(--g3); }
      .sheetLink.active { color: var(--blue); background: var(--off); }
      .sheetLink.active .navIcon { color: var(--blue); }
      .sheetLink.soon { color: var(--g3); opacity: .55; }
      .sheetLink .tag { margin-left: auto; font-size: 9px; background: var(--off); padding: 2px 7px; border-radius: 6px; text-transform: uppercase; color: var(--g3); }
      .sheetDivider { height: 1px; background: var(--border); margin: 10px 6px; }
      .sheetAccount { padding: 6px 14px 4px; }
      .sheetEmail { font-size: 12.5px; color: var(--g3); word-break: break-all; }
      .sheetCustomerId { font-size: 11.5px; color: #9aa5b1; margin-bottom: 12px; }
      .sheetSignOut {
        width: 100%; background: var(--off); border: none; border-radius: 9px; padding: 12px;
        font-size: 13.5px; font-weight: 700; color: #C0392B; cursor: pointer;
      }
      .sheetShare {
        width: 100%; background: #fff; border: 1px solid var(--border); border-radius: 9px; padding: 12px;
        font-size: 13.5px; font-weight: 700; color: var(--blue); cursor: pointer; margin-bottom: 8px;
      }
      .sheetVisitWeb {
        display: block; box-sizing: border-box; text-align: center; width: 100%;
        background: #fff; border: 1px solid var(--border); border-radius: 9px; padding: 12px;
        font-size: 13.5px; font-weight: 700; color: var(--ink); text-decoration: none; margin-bottom: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}

function togglePw(inputId, el) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text'; el.textContent = 'Hide'; }
  else { input.type = 'password'; el.textContent = 'Show'; }
}

function renderAuthBox() {
  const box = document.getElementById('authBox');
  if (!box) return;

  if (authMode === 'signin') {
    box.innerHTML = `
      <a class="backToSite" href="../index.html">← Back to Cloud Super Market</a>
      <h1>VIPL Internal</h1>
      <p>Sign in with your email, phone number, or Customer ID.</p>
      <input type="text" id="authIdentifier" placeholder="Email, phone, or Customer ID">
      <div class="pwWrap">
        <input type="password" id="authPass" placeholder="Password">
        <span class="pwToggle" onclick="togglePw('authPass', this)">Show</span>
      </div>
      <div class="forgotLink"><a id="toForgot">Forgot password?</a></div>
      <button id="signInBtn">Sign In</button>
      <div id="authMsg"></div>
      <div class="authSwitch">New team member? <a id="toSignup">Create an account</a></div>
    `;
    document.getElementById('signInBtn').onclick = signIn;
    document.getElementById('toSignup').onclick = () => { authMode = 'signup'; renderAuthBox(); };
    document.getElementById('toForgot').onclick = () => { authMode = 'forgot'; renderAuthBox(); };

  } else if (authMode === 'signup') {
    box.innerHTML = `
      <a class="backToSite" href="../index.html">← Back to Cloud Super Market</a>
      <h1>Create your account</h1>
      <p>Sign up to request access to VIPL Internal. You'll get a Customer ID you can use to log in later, alongside your email or phone. An admin will review and assign your role before you can see any financial data.</p>
      <input type="text" id="signupName" placeholder="Full name">
      <input type="email" id="signupEmail" placeholder="Email address">
      <input type="tel" id="signupPhone" placeholder="Phone number">
      <div class="pwWrap">
        <input type="password" id="signupPass" placeholder="Password (min 6 characters)">
        <span class="pwToggle" onclick="togglePw('signupPass', this)">Show</span>
      </div>
      <select id="signupRequestedRole">
        ${REQUESTED_ROLE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
      <button id="signUpBtn">Create Account</button>
      <div id="authMsg"></div>
      <div class="authSwitch">Already have an account? <a id="toSignin">Sign in</a></div>
    `;
    document.getElementById('signUpBtn').onclick = signUp;
    document.getElementById('toSignin').onclick = () => { authMode = 'signin'; renderAuthBox(); };

  } else if (authMode === 'forgot') {
    box.innerHTML = `
      <a class="backToSite" href="../index.html">← Back to Cloud Super Market</a>
      <h1>Reset your password</h1>
      <p>Enter your email, phone, or Customer ID and we'll send a password reset link to your registered email.</p>
      <input type="text" id="forgotIdentifier" placeholder="Email, phone, or Customer ID">
      <button id="sendResetBtn">Send Reset Link</button>
      <div id="authMsg"></div>
      <div class="authSwitch">Remembered it? <a id="toSignin">Sign in</a></div>
    `;
    document.getElementById('sendResetBtn').onclick = sendResetLink;
    document.getElementById('toSignin').onclick = () => { authMode = 'signin'; renderAuthBox(); };

  } else if (authMode === 'reset') {
    box.innerHTML = `
      <h1>Set a new password</h1>
      <p>Choose a new password for your account.</p>
      <div class="pwWrap">
        <input type="password" id="newPass" placeholder="New password (min 6 characters)">
        <span class="pwToggle" onclick="togglePw('newPass', this)">Show</span>
      </div>
      <div class="pwWrap">
        <input type="password" id="newPassConfirm" placeholder="Confirm new password">
        <span class="pwToggle" onclick="togglePw('newPassConfirm', this)">Show</span>
      </div>
      <button id="resetSubmitBtn">Set New Password</button>
      <div id="authMsg"></div>
    `;
    document.getElementById('resetSubmitBtn').onclick = submitNewPassword;
  }
}

// Split a "🏠 Overview" style label into { icon, text }
function splitIconLabel(label) {
  const parts = label.split(' ');
  return { icon: parts[0], text: parts.slice(1).join(' ') };
}

// ── ICONS ───────────────────────────────────────────
// One line-icon style: 24-unit grid, 1.8 stroke, round caps, currentColor.
// Looked up by href (or by label for "Soon" items), so NAV_CONFIG stays as is.
const ICON_PATHS = {
  home:      '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  monitor:   '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="m7 11 2.5-2.5 2.5 2.5L16 7"/>',
  list:      '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  book:      '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7.5h8M8 11h6"/>',
  barChart:  '<path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
  card:      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  fileText:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  calculator:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  file:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  receipt:   '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  store:     '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v8h13v-8M10 20v-5h4v5"/>',
  trending:  '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  bank:      '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20.5h18"/>',
  users:     '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.8a3.2 3.2 0 0 1 0 6.4M17.5 14.7c2.1.6 3.5 2.6 3.5 5.3"/>',
  truck:     '<path d="M3 6h11v10H3z"/><path d="M14 9.5h4l3 3.5v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  key:       '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
  user:      '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  map:       '<path d="m3 6.5 6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  grid:      '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  pie:       '<path d="M12 3v9h9"/><path d="M20.5 15.5A9 9 0 1 1 8.5 3.7"/>',
  inbox:     '<path d="M3 13.5 5.5 5h13l2.5 8.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/>',
  workflow:  '<rect x="3" y="3.5" width="7" height="6" rx="1.5"/><rect x="14" y="14.5" width="7" height="6" rx="1.5"/><path d="M6.5 9.5v3a2 2 0 0 0 2 2H14"/>',
  tractor:   '<circle cx="7" cy="16" r="4"/><circle cx="18" cy="17.5" r="2.5"/><path d="M4.5 12.5V6h6l2 6.5h5.5l1 3"/><path d="M15 12.5V8"/>',
  shield:    '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  tag:       '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-7.2 7.2a1.4 1.4 0 0 1-2 0z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  idCard:    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M15 10h3M15 13.5h3"/>',
  globe:     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  share:     '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  logout:    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  more:      '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  wallet:    '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="17" height="11" rx="2"/><path d="M16.5 13.5h.01"/>',
  cash:      '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>',
};
const ICON_BY_HREF = {
  'index.html': 'home', 'command-center.html': 'monitor', 'audit-feed.html': 'list',
  'ledger.html': 'book', 'dashboard.html': 'barChart', 'loan-portal.html': 'card',
  'statements.html': 'fileText', 'gst-audit.html': 'calculator', 'invoices.html': 'file',
  'receipts.html': 'receipt', 'investor-portal.html': 'trending', 'director-share.html': 'bank',
  'warehouse-management.html': 'truck', 'roles.html': 'key', 'employees.html': 'user',
  'fbc-states.html': 'map', 'fbc-dashboard.html': 'grid', 'fbc-crm-dashboard.html': 'pie',
  'leads-crm.html': 'inbox', 'subscribers-crm.html': 'workflow', 'fbc-employees.html': 'tractor',
  'fbc-admin-team.html': 'shield', 'party-tagging.html': 'tag', 'people-overview.html': 'idCard',
};
const ICON_BY_SOON_LABEL = { 'Stores': 'store', 'Subscribers': 'users' };

function svgIcon(name, cls) {
  const p = ICON_PATHS[name] || ICON_PATHS.file;
  return `<svg class="${cls || 'navIcon'}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}
function navItemParts(item) {
  const { text } = splitIconLabel(item.label);
  const name = item.href ? ICON_BY_HREF[item.href] : ICON_BY_SOON_LABEL[text];
  return { text, iconName: name || 'file' };
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// Shared with pages (e.g. Overview cards) so icons stay consistent.
window.VIPL_ICONS = { svg: svgIcon, byHref: ICON_BY_HREF };

function renderSidebar() {
  const role = window.VIPL.profile ? window.VIPL.profile.role : 'viewer';
  const email = window.VIPL.user ? window.VIPL.user.email : '';
  const customerId = window.VIPL.profile ? window.VIPL.profile.customer_id || '' : '';
  const displayName = (window.VIPL.profile && window.VIPL.profile.full_name) || email || '';
  const initials = displayName.trim().split(/[\s@._-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '·';

  // ── Desktop sidebar ──
  let html = `
    <a class="brand" href="index.html" aria-label="VIPL Internal — Overview">
      <span class="logoTile"><img src="../logo-footer.png" alt="Vaaralabbayi India Private Limited" width="150" height="82"></span>
      <span class="brandSub">VIPL Internal</span>
    </a>
    <div id="roleBadge">${escHtml(ROLE_LABELS[role] || role)}</div>
    <div class="navMain" role="navigation" aria-label="Main">
  `;
  // (a div, not <nav>: ../style.css styles every <nav> as the public site's fixed top bar)
  NAV_CONFIG.forEach(group => {
    const visibleItems = group.items.filter(item => item.roles === 'all' || item.roles.includes(role));
    if (!visibleItems.length) return;
    html += `<div class="navGroup"><div class="navGroupLbl">${group.group}</div>`;
    visibleItems.forEach(item => {
      const { text, iconName } = navItemParts(item);
      if (item.soon || !item.href) {
        html += `<a class="navLink soon" aria-disabled="true">${svgIcon(iconName)}<span>${text}</span><span class="tag">Soon</span></a>`;
      } else {
        const isActive = currentPage === item.href;
        html += `<a class="navLink${isActive ? ' active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}>${svgIcon(iconName)}<span>${text}</span></a>`;
      }
    });
    html += `</div>`;
  });
  html += `
    </div>
    <div id="sidebarFooter">
      <div class="userBlock">
        <div class="userAvatar" aria-hidden="true">${escHtml(initials)}</div>
        <div class="userMeta">
          <div class="userEmail" title="${escHtml(email)}">${escHtml(email)}</div>
          <div class="userCustomerId">${escHtml(customerId)}</div>
        </div>
      </div>
      <a id="visitWebsiteBtn" class="sideBtn" href="../index.html">${svgIcon('globe', '')}<span>Visit Website</span></a>
      <button id="shareAppBtn" class="sideBtn" type="button" onclick="shareApp('shareAppBtn')">${svgIcon('share', '')}<span>Share App</span></button>
      <button id="signOutBtn" class="sideBtn" type="button">${svgIcon('logout', '')}<span>Sign Out</span></button>
    </div>
  `;
  document.getElementById('sidebar').innerHTML = html;
  document.getElementById('signOutBtn').onclick = signOut;

  renderBottomNav(role, email, customerId);
}

// ── Mobile bottom tab bar + "More" sheet ──
function renderBottomNav(role, email, customerId) {
  let bottomNav = document.getElementById('bottomNav');
  let backdrop = document.getElementById('moreSheetBackdrop');
  let sheet = document.getElementById('moreSheet');
  if (!bottomNav) {
    bottomNav = document.createElement('div'); bottomNav.id = 'bottomNav';
    backdrop = document.createElement('div'); backdrop.id = 'moreSheetBackdrop';
    sheet = document.createElement('div'); sheet.id = 'moreSheet';
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.appendChild(bottomNav);
    backdrop.onclick = closeMoreSheet;
  }

  // Flatten all visible items (real links only, "soon" kept for the sheet)
  const flatLinked = [];
  const flatAll = [];
  NAV_CONFIG.forEach(group => {
    group.items.filter(item => item.roles === 'all' || item.roles.includes(role)).forEach(item => {
      flatAll.push(item);
      if (item.href && !item.soon) flatLinked.push(item);
    });
  });

  const MAX_TABS = 4;
  const primaryTabs = flatLinked.slice(0, MAX_TABS);
  const primaryHrefs = new Set(primaryTabs.map(i => i.href));
  const overflowItems = flatAll.filter(i => !(i.href && primaryHrefs.has(i.href)));

  // Bottom bar tabs
  bottomNav.setAttribute('aria-label', 'Main');
  bottomNav.innerHTML = primaryTabs.map(item => {
    const { text, iconName } = navItemParts(item);
    const isActive = currentPage === item.href;
    return `<a class="bnItem${isActive ? ' active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}><span class="bnIcon">${svgIcon(iconName, '')}</span>${text}</a>`;
  }).join('') + `<button class="bnItem" type="button" onclick="openMoreSheet()"><span class="bnIcon">${svgIcon('more', '')}</span>More</button>`;

  // "More" sheet: overflow nav items (incl. soon) + account + sign out
  let sheetHtml = `<div class="sheetHandle"></div>`;
  if (overflowItems.length) {
    sheetHtml += `<div class="sheetGroupLbl">More</div>`;
    overflowItems.forEach(item => {
      const { text, iconName } = navItemParts(item);
      if (item.soon || !item.href) {
        sheetHtml += `<div class="sheetLink soon">${svgIcon(iconName)}<span>${text}</span><span class="tag">Soon</span></div>`;
      } else {
        const isActive = currentPage === item.href;
        sheetHtml += `<a class="sheetLink${isActive ? ' active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}>${svgIcon(iconName)}<span>${text}</span></a>`;
      }
    });
    sheetHtml += `<div class="sheetDivider"></div>`;
  }
  sheetHtml += `
    <div class="sheetAccount">
      <div class="sheetEmail">${escHtml(email)}</div>
      <div class="sheetCustomerId">${escHtml(customerId)}</div>
      <a class="sheetVisitWeb" href="../index.html">Visit Website</a>
      <button class="sheetShare" id="sheetShareBtn" type="button" onclick="shareApp('sheetShareBtn')">Share App</button>
      <button class="sheetSignOut" id="sheetSignOutBtn" type="button">Sign Out</button>
    </div>
  `;
  sheet.innerHTML = sheetHtml;
  document.getElementById('sheetSignOutBtn').onclick = signOut;
}

function openMoreSheet() {
  document.getElementById('moreSheetBackdrop').classList.add('open');
  document.getElementById('moreSheet').classList.add('open');
}
function closeMoreSheet() {
  document.getElementById('moreSheetBackdrop').classList.remove('open');
  document.getElementById('moreSheet').classList.remove('open');
}

async function shareApp(btnId) {
  const url = window.location.origin + '/vipl/index.html';
  const shareData = {
    title: 'VIPL Internal',
    text: 'VIPL Internal — sign in to view the company dashboard.',
    url
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) { /* user cancelled — no-op */ }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      const btn = document.getElementById(btnId);
      if (btn) {
        // Swap only the text span (if any) so the button's icon survives.
        const target = btn.querySelector('span') || btn;
        const original = target.textContent;
        target.textContent = 'Link copied!';
        setTimeout(() => { target.textContent = original; }, 1800);
      }
    } catch (e) { /* clipboard unavailable — silently ignore */ }
  }
}

// Resolve an email/phone/customer_id identifier down to an actual email address
async function resolveEmailFromIdentifier(identifier) {
  if (identifier.includes('@')) return identifier;
  const { data, error } = await sb
    .from('profiles')
    .select('email')
    .or(`phone.eq.${identifier},customer_id.eq.${identifier}`)
    .maybeSingle();
  if (error || !data) return null;
  return data.email;
}

async function signIn() {
  const identifier = document.getElementById('authIdentifier').value.trim();
  const password = document.getElementById('authPass').value;
  const msg = document.getElementById('authMsg');
  if (!identifier || !password) {
    msg.style.color = '#C0392B'; msg.textContent = 'Please enter your email, phone, or Customer ID and password.'; return;
  }
  msg.style.color = 'var(--g3)'; msg.textContent = 'Signing in…';

  const email = await resolveEmailFromIdentifier(identifier);
  if (!email) {
    msg.style.color = '#C0392B'; msg.textContent = 'No account found with that phone number or Customer ID.'; return;
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { msg.style.color = '#C0392B'; msg.textContent = error.message; return; }
  await bootstrap();
}

async function signUp() {
  const full_name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPass').value;
  const requestedRole = document.getElementById('signupRequestedRole').value;
  const msg = document.getElementById('authMsg');

  if (!full_name || !email || !phone || !password) {
    msg.style.color = '#C0392B'; msg.textContent = 'Please fill in all fields.'; return;
  }
  if (password.length < 6) {
    msg.style.color = '#C0392B'; msg.textContent = 'Password must be at least 6 characters.'; return;
  }

  msg.style.color = 'var(--g3)'; msg.textContent = 'Checking your details…';

  // Duplicate check on email OR phone before attempting signup
  const { data: existing, error: checkErr } = await sb
    .from('profiles')
    .select('email, phone')
    .or(`email.eq.${email},phone.eq.${phone}`);

  if (!checkErr && existing && existing.length) {
    const emailMatch = existing.some(p => p.email === email);
    const phoneMatch = existing.some(p => p.phone === phone);
    msg.style.color = '#C0392B';
    if (emailMatch && phoneMatch) {
      msg.textContent = 'An account with this email and phone number already exists. Try signing in instead.';
    } else if (emailMatch) {
      msg.textContent = 'An account with this email already exists. Try signing in instead.';
    } else {
      msg.textContent = 'An account with this phone number already exists. Try signing in instead.';
    }
    return;
  }

  msg.style.color = 'var(--g3)'; msg.textContent = 'Creating your account…';
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name, phone, requested_role: requestedRole } }
  });
  if (error) { msg.style.color = '#C0392B'; msg.textContent = error.message; return; }

  if (data.session) {
    await showCustomerIdThenContinue(data.user.id);
  } else {
    msg.style.color = 'var(--green)';
    msg.textContent = 'Account created! Check your email to confirm it, then sign in.';
    setTimeout(() => { authMode = 'signin'; renderAuthBox(); }, 3000);
  }
}

async function sendResetLink() {
  const identifier = document.getElementById('forgotIdentifier').value.trim();
  const msg = document.getElementById('authMsg');
  if (!identifier) {
    msg.style.color = '#C0392B'; msg.textContent = 'Please enter your email, phone, or Customer ID.'; return;
  }
  msg.style.color = 'var(--g3)'; msg.textContent = 'Looking up your account…';

  const email = await resolveEmailFromIdentifier(identifier);
  if (!email) {
    msg.style.color = '#C0392B'; msg.textContent = 'No account found with that email, phone, or Customer ID.'; return;
  }

  msg.textContent = 'Sending reset link…';
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) { msg.style.color = '#C0392B'; msg.textContent = error.message; return; }

  msg.style.color = 'var(--green)';
  msg.textContent = 'Reset link sent! Check your email.';
}

async function submitNewPassword() {
  const p1 = document.getElementById('newPass').value;
  const p2 = document.getElementById('newPassConfirm').value;
  const msg = document.getElementById('authMsg');
  if (!p1 || p1.length < 6) {
    msg.style.color = '#C0392B'; msg.textContent = 'Password must be at least 6 characters.'; return;
  }
  if (p1 !== p2) {
    msg.style.color = '#C0392B'; msg.textContent = 'Passwords do not match.'; return;
  }
  msg.style.color = 'var(--g3)'; msg.textContent = 'Updating password…';
  const { error } = await sb.auth.updateUser({ password: p1 });
  if (error) { msg.style.color = '#C0392B'; msg.textContent = error.message; return; }

  msg.style.color = 'var(--green)'; msg.textContent = 'Password updated! Signing you in…';
  setTimeout(async () => {
    history.replaceState(null, '', location.pathname);
    await bootstrap();
  }, 1200);
}

async function showCustomerIdThenContinue(userId) {
  const { data: profile } = await sb.from('profiles').select('customer_id').eq('id', userId).single();
  const box = document.getElementById('authBox');
  box.innerHTML = `
    <h1>Account created 🎉</h1>
    <p>Your Customer ID is:</p>
    <div class="customerIdBox">${profile?.customer_id || '—'}</div>
    <p>You can log in next time with your email, phone number, or this Customer ID — save it somewhere safe.</p>
    <button id="continueBtn">Continue</button>
  `;
  document.getElementById('continueBtn').onclick = bootstrap;
}

async function signOut() {
  await sb.auth.signOut();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authBox').style.display = 'block';
  closeMoreSheet();
  ['bottomNav', 'moreSheetBackdrop', 'moreSheet'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  authMode = 'signin';
  renderAuthBox();
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

  if (profile && profile.role === 'pending') {
    document.getElementById('mainArea').innerHTML = `
      <div class="pendingBox">
        <div class="emoji">⏳</div>
        <h2>Your account is pending approval</h2>
        <div class="idTag">${profile.customer_id || ''}</div>
        <p>Thanks for signing up, ${profile.full_name || 'there'}! An admin needs to review your account and assign your access level before you can see anything else. You'll be able to log in and see the full dashboard once that's done — no need to sign up again.</p>
      </div>
    `;
    return;
  }

  if (typeof window.onVIPLReady === 'function') window.onVIPLReady();
}

// ── INIT ─────────────────────────────────────────────
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    authMode = 'reset';
    renderAuthBox();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  injectShellStyles();

  // Detect a password-recovery link directly and synchronously from the URL, rather than
  // racing the async onAuthStateChange('PASSWORD_RECOVERY') event against getSession() below —
  // that race is exactly what let recovery links sometimes log someone straight into the app
  // instead of showing "set a new password", depending on which one happened to resolve first.
  // Supabase's recovery redirect always includes type=recovery in the URL hash, so this check
  // is reliable with no timing dependency at all.
  if (window.location.hash.includes('type=recovery')) {
    authMode = 'reset';
  }

  renderAuthBox();
  const { data: { session } } = await sb.auth.getSession();
  if (session && authMode !== 'reset') await bootstrap();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../service-worker.js').catch(() => {});
  }
});
