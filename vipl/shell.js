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
const NAV_CONFIG = [
  { group: 'General', items: [
    { label: '🏠 Overview', href: 'index.html', roles: 'all' },
  ]},
  { group: 'Finance', items: [
    { label: '📒 Ledger Entry', href: 'ledger.html', roles: ['super_admin','accountant','entry'] },
    { label: '📊 Financial Dashboard', href: 'dashboard.html', roles: ['super_admin','accountant'] },
    { label: '💳 Loan Portal', href: 'loan-portal.html', roles: ['super_admin','accountant','investor'] },
  ]},
  { group: 'Operations', items: [
    { label: '🏪 Stores', href: null, roles: ['super_admin','store_operator'], soon: true },
    { label: '📈 Investor Portal', href: 'investor-portal.html', roles: ['super_admin','accountant','investor'] },
    { label: '👥 Subscribers', href: null, roles: ['super_admin','subscriber'], soon: true },
    { label: '🚚 Supply Chain', href: null, roles: ['super_admin','fbc_rm','fbc_bdm','fbc_mm'], soon: true },
  ]},
  { group: 'Admin', items: [
    { label: '🧩 Role Management', href: 'roles.html', roles: ['super_admin','admin','hr_manager'] },
    { label: '👤 Employee Management', href: 'employees.html', roles: ['super_admin','admin','hr_manager'] },
  ]},
];

const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Admin', hr_manager: 'HR Manager',
  accountant: 'Accountant', entry: 'Entry Staff',
  store_operator: 'Store Operator', fbc_rm: 'FBC — RM', fbc_bdm: 'FBC — BDM',
  fbc_mm: 'FBC — MM', investor: 'Investor', subscriber: 'Subscriber', viewer: 'Viewer',
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
    #sidebarFooter .userEmail { font-size: 12px; color: rgba(255,255,255,.5); padding: 0 8px; margin-bottom: 4px; word-break: break-all; }
    #sidebarFooter .userCustomerId { font-size: 11px; color: rgba(255,255,255,.35); padding: 0 8px; margin-bottom: 10px; }
    #signOutBtn { width: 100%; background: rgba(255,255,255,.08); border: none; border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    #mainArea { margin-left: 230px; padding: 32px 40px; max-width: 1100px; }
    #mainArea h1.pageTitle { font-family:'Plus Jakarta Sans',sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 20px; }
    .pendingBox { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 40px; text-align: center; max-width: 480px; margin: 40px auto; }
    .pendingBox .emoji { font-size: 40px; margin-bottom: 12px; }
    .pendingBox h2 { font-family:'Plus Jakarta Sans',sans-serif; font-size: 19px; font-weight: 800; margin-bottom: 8px; }
    .pendingBox p { font-size: 13.5px; color: var(--g3); line-height: 1.5; }
    .pendingBox .idTag { display: inline-block; font-weight: 800; color: var(--blue); background: var(--off); padding: 4px 10px; border-radius: 6px; margin: 8px 0 16px; }
    @media (max-width: 768px) {
      #sidebar { width: 100%; height: auto; position: relative; flex-direction: row; overflow-x: auto; }
      #mainArea { margin-left: 0; padding: 24px 16px; }
      #sidebar .brand, #sidebarFooter, .navGroupLbl, #roleBadge { display: none; }
      .navGroup { display: flex; margin-bottom: 0; }
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
      <div class="userCustomerId">${window.VIPL.profile ? window.VIPL.profile.customer_id || '' : ''}</div>
      <button id="signOutBtn">Sign Out</button>
    </div>
  `;
  document.getElementById('sidebar').innerHTML = html;
  document.getElementById('signOutBtn').onclick = signOut;
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
  renderAuthBox();
  const { data: { session } } = await sb.auth.getSession();
  if (session && authMode !== 'reset') await bootstrap();
});
