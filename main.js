/* ═══════════════════════════════════════════════════
   VIPL — Cloud Super Market
   Shared JavaScript — main.js
   Handles: nav, language toggle, animations
═══════════════════════════════════════════════════ */

// ── NAVBAR SCROLL EFFECT ──────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 30);
});

// ── LANGUAGE TOGGLE ───────────────────────────────
function setLang(lang, e) {
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  if (lang === 'te') {
    document.body.classList.add('te');
    document.querySelectorAll('.tel').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.eng').forEach(el => el.style.display = 'none');
  } else {
    document.body.classList.remove('te');
    document.querySelectorAll('.eng').forEach(el => el.style.display = '');
    document.querySelectorAll('.tel').forEach(el => el.style.display = 'none');
  }
  // Save preference
  localStorage.setItem('vipl-lang', lang);
}

// ── RESTORE LANGUAGE PREFERENCE ──────────────────
function restoreLang() {
  const saved = localStorage.getItem('vipl-lang');
  if (saved === 'te') {
    document.body.classList.add('te');
    document.querySelectorAll('.tel').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.eng').forEach(el => el.style.display = 'none');
    const tBtn = document.querySelector('.lang-btn[data-lang="te"]');
    const eBtn = document.querySelector('.lang-btn[data-lang="en"]');
    if (tBtn) tBtn.classList.add('active');
    if (eBtn) eBtn.classList.remove('active');
  }
}

// ── SCROLL ANIMATIONS ────────────────────────────
function observeAnims() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => {
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
document.addEventListener('DOMContentLoaded', () => {
  restoreLang();
  setActiveNav();
  observeAnims();
});
