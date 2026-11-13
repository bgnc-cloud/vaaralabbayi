/* ═══════════════════════════════════════════════════
   VIPL — Cloud Super Market
   Shared JavaScript — main.js
   Handles: nav, language toggle, animations
═══════════════════════════════════════════════════ */

// ── SAFE STORAGE ──────────────────────────────────
// localStorage can throw (private mode, blocked site data), so every
// access goes through these and simply falls back to "nothing saved".
function readPref(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}
function writePref(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) { /* not saved; fine */ }
}

// ── NAVBAR SCROLL EFFECT ──────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
});

// ── MOBILE MENU ───────────────────────────────────
function toggleMenu(btn) {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// ── LANGUAGE TOGGLE ───────────────────────────────
function applyLang(lang) {
  const te = lang === 'te';
  document.documentElement.lang = te ? 'te' : 'en';
  document.body.classList.toggle('te', te);
  document.querySelectorAll('.tel').forEach(el => el.style.display = te ? 'block' : 'none');
  document.querySelectorAll('.eng').forEach(el => el.style.display = te ? 'none' : '');
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === (te ? 'te' : 'en')));
  // Image alt text follows the language (data-alt-en / data-alt-te).
  try {
    document.querySelectorAll('img[data-alt-en]').forEach(img => {
      const alt = te ? (img.dataset.altTe || img.dataset.altEn) : img.dataset.altEn;
      if (alt) img.alt = alt;
    });
  } catch (_) { /* alt text stays as it was */ }
}

function setLang(lang, e) {
  applyLang(lang);
  writePref('vipl-lang', lang);
}

// ── RESTORE LANGUAGE PREFERENCE ──────────────────
function restoreLang() {
  if (readPref('vipl-lang') === 'te') applyLang('te');
}

// ── SCROLL ANIMATIONS ────────────────────────────
function observeAnims() {
  const els = document.querySelectorAll('.fade-up');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('vis'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.1 });
  els.forEach(el => {
    el.classList.remove('vis');
    obs.observe(el);
  });
}

// ── ACTIVE NAV LINK ──────────────────────────────
function setActiveNav() {
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    if (a.dataset.page === page || (page === 'index' && a.dataset.page === 'home')) {
      a.classList.add('active');
    }
  });
}

// ── INIT ON PAGE LOAD ────────────────────────────
// Each step is isolated so one failure can't stop the others — in
// particular observeAnims must always run, or .fade-up sections stay hidden.
document.addEventListener('DOMContentLoaded', () => {
  try { restoreLang(); } catch (err) { console.error('restoreLang failed', err); }
  try { setActiveNav(); } catch (err) { console.error('setActiveNav failed', err); }
  try { observeAnims(); } catch (err) {
    console.error('observeAnims failed', err);
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('vis'));
  }
});
