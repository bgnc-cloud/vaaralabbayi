// api/submit-lead.js
// Vercel serverless function — receives submissions from the public
// contact.html form and forwards them into the Leads CRM (a separate
// Supabase project: FBC Network). Previously wrote to Airtable; replaced
// entirely since that base was empty/unused. Validation logic below
// (honeypot, length caps, phone format, enquiry-type whitelist) is carried
// over from that version largely as-is — it was solid.
//
// Must live at api/submit-lead.js at the repo root for Vercel to pick it
// up automatically as a serverless function.

const FBC_URL = 'https://uwoptohruurhbhatwkiz.supabase.co';

// contact.html's <select id="fEnquiry"> values -> our leads.lead_type values.
const ENQUIRY_TO_LEAD_TYPE = {
  subscribe: 'subscriber_interest',
  store: 'fo_dso_recruitment',
  fbc: 'fbc_team_recruitment',
  investor: 'investor',
  general: 'general_enquiry',
};

// Lead types that must name a mandal or city (the CRM routes them by area). The others need a
// district only; a mandal is sent if the visitor chose one. Same rule as the Edge Function.
const MANDAL_REQUIRED = new Set(['subscriber_interest', 'fo_dso_recruitment', 'fbc_team_recruitment']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A filled spam trap only counts as a bot if the form was sent this soon after the page loaded.
const SPAM_TRAP_MIN_MS = 3000;

// Every dropped submission is logged with a short reason only: never names, phone numbers or messages.
function logDrop(reason) {
  console.warn(`submit-lead: dropped (${reason})`);
}

// Milliseconds between the page loading and the form being sent, or null if unknown.
// Both times come from the browser's own clock, so a wrong clock on the visitor's device does not
// matter. If the submit time is missing, the server clock is used instead.
function msSinceFormLoaded(formLoadedAt, formSubmittedAt) {
  const loaded = Number(formLoadedAt);
  if (!Number.isFinite(loaded) || loaded <= 0) return null;
  const submitted = Number(formSubmittedAt);
  const now = Number.isFinite(submitted) && submitted > 0 ? submitted : Date.now();
  return now - loaded;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const {
    fullName, mobileNumber, district_id, mandal_id,
    enquiryType, message, source, campaignName, consent,
    hp_extra, formLoadedAt, formSubmittedAt,
  } = body;

  // Old spam-trap name (companyWebsite, also accepted as company_website): pages cached from
  // before the rename still send it. Same behaviour as before: filled means bot, pretend success,
  // write nothing. Browser autofill could fill this old field, which is why it was renamed.
  if (body.companyWebsite || body.company_website) {
    logDrop('old spam-trap field filled');
    return res.status(200).json({ success: true });
  }

  // New spam trap (hp_extra). Real people never see it, but a browser or password manager might
  // still fill it. Bots fill it instantly, so it only counts as spam if the form came in under
  // 3 seconds after the page loaded, or without the loaded-at time. Otherwise it is ignored
  // (never forwarded) and the lead is saved.
  if (hp_extra && String(hp_extra).trim()) {
    const elapsed = msSinceFormLoaded(formLoadedAt, formSubmittedAt);
    if (elapsed === null) {
      logDrop('spam trap filled, no loaded-at time');
      return res.status(200).json({ success: true });
    }
    if (elapsed < SPAM_TRAP_MIN_MS) {
      logDrop('spam trap filled, sent under 3s after load');
      return res.status(200).json({ success: true });
    }
    // A person (probably autofill): carry on and save the lead.
  }

  if (!fullName || !mobileNumber || !enquiryType) {
    logDrop('missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const lead_type = ENQUIRY_TO_LEAD_TYPE[enquiryType];
  if (!lead_type) {
    logDrop('invalid enquiry type');
    return res.status(400).json({ error: 'Invalid enquiry type' });
  }

  // Basic sanity limits — nothing here should legitimately be long. Caps
  // prevent someone from submitting megabyte-sized field values that bloat
  // storage or slow the request.
  const MAX = { fullName: 120, mobileNumber: 20, message: 2000 };
  const fields = { fullName, mobileNumber, message };
  for (const [key, max] of Object.entries(MAX)) {
    if (fields[key] && String(fields[key]).length > max) {
      logDrop(`${key} too long`);
      return res.status(400).json({ error: `${key} is too long` });
    }
  }

  // Area ids from the State / District / Mandal-or-City pickers (get-lead-geo). Format only here;
  // the Edge Function checks that they exist and that the mandal is in the district.
  const districtId = district_id ? String(district_id).trim() : '';
  const mandalId = mandal_id ? String(mandal_id).trim() : '';
  if (!districtId || !UUID_RE.test(districtId)) {
    logDrop(districtId ? 'district_id not a UUID' : 'district_id missing');
    return res.status(400).json({ error: 'Please choose your district.' });
  }
  if (mandalId && !UUID_RE.test(mandalId)) {
    logDrop('mandal_id not a UUID');
    return res.status(400).json({ error: 'Please choose your mandal or city.' });
  }
  if (!mandalId && MANDAL_REQUIRED.has(lead_type)) {
    logDrop('mandal_id missing');
    return res.status(400).json({ error: 'Please choose your mandal or city.' });
  }

  // First gate only, so obvious garbage never reaches the CRM. Loose but
  // real phone-format check — allows +91, spaces, hyphens, 10–13 digits overall. Intentionally not stricter than this: real submissions
  // vary (landlines, +91 prefix, etc.) and the goal is filtering obvious
  // garbage, not being a strict phone validator. The Edge Function does the
  // final normalization.
  const digitsOnly = String(mobileNumber).replace(/[^\d]/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    logDrop('invalid phone format');
    return res.status(400).json({ error: 'Please enter a valid mobile number' });
  }

  try {
    const submitRes = await fetch(`${FBC_URL}/functions/v1/submit-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_type,
        full_name: String(fullName).trim(),
        phone: String(mobileNumber).trim(),
        email: null,
        source: source || 'website',
        campaign_name: campaignName || null,
        district_id: districtId,
        mandal_id: mandalId || null,
        extra_fields: {
          message: message ? String(message).trim() : null,
          // Timestamp set here (server clock), not trusted from the browser.
          // Older clients that don't send consent are still accepted; they get null.
          consent_given_at: consent === true ? new Date().toISOString() : null,
        },
      }),
    });

    let result = {};
    try { result = await submitRes.json(); } catch (_) { /* non-JSON reply: handled by status below */ }
    // 429 = the CRM's hourly lead budget is full. Pass its friendly message
    // through so the visitor knows to try again later.
    if (submitRes.status === 429) {
      const busy = typeof result.error === 'string' && result.error
        ? result.error
        : 'We are receiving a lot of enquiries right now. Please try again in an hour.';
      logDrop('CRM hourly budget full (429)');
      return res.status(429).json({ error: busy });
    }
    // 400 = the CRM rejected the details. Its message is written for visitors (it never contains
    // internal reasons), so pass it through instead of a generic failure.
    if (submitRes.status === 400) {
      logDrop('CRM rejected (400)');
      return res.status(400).json({
        error: typeof result.error === 'string' && result.error ? result.error : 'Please check your details and try again.',
      });
    }
    if (!submitRes.ok) {
      console.error('CRM submit-lead error:', result.error);
      logDrop(`CRM error ${submitRes.status}`);
      return res.status(502).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({ success: true, lead_id: result.lead_id });
  } catch (err) {
    console.error('Submit-lead error:', err);
    logDrop('server error');
    return res.status(500).json({ error: 'Server error' });
  }
}
