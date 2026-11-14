// lead-geo.js — State / District / Mandal-or-City pickers for the public lead forms
// (contact.html and vipl/lead-form.html). Lists come from the get-lead-geo Edge Function on the
// FBC Network project, a public read-only function that needs no auth header.
//
//   POST {}              -> { state: { id, name }, districts: [{ id, name }] }
//   POST { district_id } -> { mandals: [{ id, name, division }] }   (sorted by name)
//
// The districts list and each district's mandals are cached in memory for the page session.
// A failed load is not cached, so "Try again" asks the server again.
(function () {
  const ENDPOINT = 'https://uwoptohruurhbhatwkiz.supabase.co/functions/v1/get-lead-geo';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isItem = x => x && typeof x.id === 'string' && UUID_RE.test(x.id) && typeof x.name === 'string' && x.name.trim();

  async function call(body) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('get-lead-geo HTTP ' + res.status);
    return res.json();
  }

  let districtsPromise = null;
  function getDistricts() {
    if (!districtsPromise) {
      districtsPromise = call({}).then(d => {
        if (!d || !isItem(d.state) || !Array.isArray(d.districts) || !d.districts.length) throw new Error('get-lead-geo: bad districts reply');
        return { state: d.state, districts: d.districts.filter(isItem) };
      });
      districtsPromise.catch(() => { districtsPromise = null; });
    }
    return districtsPromise;
  }

  const mandalsCache = new Map(); // district id -> Promise<[{ id, name, division }]>
  function getMandals(districtId) {
    if (!mandalsCache.has(districtId)) {
      const p = call({ district_id: districtId }).then(d => {
        if (!d || !Array.isArray(d.mandals)) throw new Error('get-lead-geo: bad mandals reply');
        return d.mandals.filter(isItem);
      });
      p.catch(() => mandalsCache.delete(districtId));
      mandalsCache.set(districtId, p);
    }
    return mandalsCache.get(districtId);
  }

  // A message is a plain string, or { en, te } on the bilingual site. Both languages are rendered
  // as .eng / .tel spans so the site's language toggle switches them like any other text.
  function isTe() { return document.body.classList.contains('te'); }
  function textOf(msg) { return typeof msg === 'string' ? msg : (isTe() ? (msg.te || msg.en) : msg.en); }
  function appendMsg(parent, msg) {
    if (typeof msg === 'string') { parent.appendChild(document.createTextNode(msg)); return; }
    const en = document.createElement('span'); en.className = 'eng'; en.textContent = msg.en;
    const te = document.createElement('span'); te.className = 'tel'; te.textContent = msg.te || msg.en;
    en.style.display = isTe() ? 'none' : '';
    te.style.display = isTe() ? 'inline' : 'none';
    parent.append(en, te);
  }

  function placeholder(sel, msg) {
    const o = document.createElement('option');
    o.value = ''; o.textContent = textOf(msg);
    sel.replaceChildren(o);
  }

  // opts: { stateSel, districtSel, mandalSel, statusEl, mandalStatusEl, requiredMarks (elements
  //         showing the Mandal / City "*"), t (messages, see the pages), classes: { status, error, retry } }
  function attach(opts) {
    const { stateSel, districtSel, mandalSel, statusEl, mandalStatusEl, t } = opts;
    const cls = Object.assign({ status: 'geo-status', error: 'geo-error', retry: 'geo-retry' }, opts.classes || {});
    const marks = Array.from(opts.requiredMarks || []);
    let districtsState = 'loading'; // loading | ready | failed
    let mandalsState = 'idle';      // idle (no district) | loading | ready | failed
    let mandalRequired = false;
    let token = 0;                  // ignores replies for a district that is no longer selected

    function show(el, kind, msg, retry) {
      el.replaceChildren();
      el.hidden = !msg;
      if (!msg) return;
      el.className = kind === 'error' ? cls.error : cls.status;
      el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
      appendMsg(el, msg);
      if (retry) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = cls.retry;
        appendMsg(b, t.retry);
        b.addEventListener('click', retry);
        el.appendChild(document.createTextNode(' '));
        el.appendChild(b);
      }
    }

    function resetMandal() {
      token++;
      mandalsState = 'idle';
      placeholder(mandalSel, t.mandalFirst);
      mandalSel.disabled = true;
      show(mandalStatusEl, null, null);
    }

    function loadDistricts() {
      districtsState = 'loading';
      stateSel.disabled = true; districtSel.disabled = true;
      placeholder(stateSel, t.loading); placeholder(districtSel, t.loading);
      resetMandal();
      show(statusEl, 'status', t.loadingDistricts);
      getDistricts().then(({ state, districts }) => {
        const so = document.createElement('option');
        so.value = state.id; so.textContent = state.name; so.selected = true;
        stateSel.replaceChildren(so);
        placeholder(districtSel, t.chooseDistrict);
        for (const d of districts) {
          const o = document.createElement('option');
          o.value = d.id; o.textContent = d.name;
          districtSel.appendChild(o);
        }
        stateSel.disabled = false; districtSel.disabled = false;
        districtsState = 'ready';
        show(statusEl, null, null);
      }).catch(() => {
        districtsState = 'failed';
        placeholder(stateSel, t.unavailable); placeholder(districtSel, t.unavailable);
        show(statusEl, 'error', t.districtsFailed, () => { loadDistricts(); districtSel.focus(); });
      });
    }

    function loadMandals() {
      const id = districtSel.value;
      resetMandal();
      if (!id) return;
      const mine = token;
      mandalsState = 'loading';
      placeholder(mandalSel, t.loading);
      show(mandalStatusEl, 'status', t.loadingMandals);
      getMandals(id).then(mandals => {
        if (mine !== token) return;
        // Group by division (Telugu-neutral: division names come from the database as they are).
        const groups = new Map();
        for (const m of mandals) {
          const key = m.division && String(m.division).trim() ? String(m.division).trim() : '';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(m);
        }
        const keys = Array.from(groups.keys()).sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'en'));
        placeholder(mandalSel, mandals.length ? t.chooseMandal : t.noMandals);
        for (const k of keys) {
          const g = document.createElement('optgroup');
          g.label = k || textOf(t.otherDivision);
          for (const m of groups.get(k)) {
            const o = document.createElement('option');
            o.value = m.id; o.textContent = m.name;
            g.appendChild(o);
          }
          mandalSel.appendChild(g);
        }
        mandalSel.disabled = !mandals.length;
        mandalsState = 'ready';
        show(mandalStatusEl, null, null);
      }).catch(() => {
        if (mine !== token) return;
        mandalsState = 'failed';
        placeholder(mandalSel, t.unavailable);
        show(mandalStatusEl, 'error', t.mandalsFailed, () => { loadMandals(); mandalSel.focus(); });
      });
    }

    function setMandalRequired(on) {
      mandalRequired = !!on;
      mandalSel.required = mandalRequired;
      mandalSel.setAttribute('aria-required', mandalRequired ? 'true' : 'false');
      marks.forEach(m => { m.hidden = !mandalRequired; });
    }

    districtSel.required = true;
    districtSel.setAttribute('aria-required', 'true');
    districtSel.addEventListener('change', loadMandals);
    setMandalRequired(false);
    loadDistricts();

    return {
      setMandalRequired,
      // null when the area part of the form may be sent, otherwise the key of the message in t.
      check() {
        if (districtsState === 'loading') return 'waitDistricts';
        if (districtsState === 'failed') return 'districtsFailed';
        if (!districtSel.value) return 'needDistrict';
        if (mandalSel.value) return null;
        if (!mandalRequired) return null;
        if (mandalsState === 'loading') return 'waitMandals';
        if (mandalsState === 'failed') return 'mandalsFailed';
        return 'needMandal';
      },
      focusFor(key) { (key === 'needDistrict' || key === 'districtsFailed' || key === 'waitDistricts' ? districtSel : mandalSel).focus(); },
      values() { return { district_id: districtSel.value || null, mandal_id: mandalSel.value || null }; },
      clear() { if (districtsState === 'ready') { districtSel.value = ''; resetMandal(); } },
    };
  }

  window.LeadGeo = { attach, textOf };
})();
