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
const FBC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3b3B0b2hydXVyaGJoYXR3a2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzA0OTgsImV4cCI6MjEwMTAwNjQ5OH0.5pPk1JNy1xm2NCD9Xv6rZpDrf-jprFwaXtRk4WshL18';

// contact.html's <select id="fEnquiry"> values -> our leads.lead_type values.
const ENQUIRY_TO_LEAD_TYPE = {
  subscribe: 'subscriber_interest',
  store: 'fo_dso_recruitment',
  fbc: 'fbc_team_recruitment',
  investor: 'investor',
  general: 'general_enquiry',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    fullName, mobileNumber, village, cityDistrict, state,
    enquiryType, message, companyWebsite, source, campaignName,
  } = req.body || {};

  // Honeypot: a field real users never see or fill (hidden via CSS on the
  // form). Bots that blindly fill every input trip this — silently pretend
  // success so they don't learn they were caught, but never write anything.
  if (companyWebsite) {
    return res.status(200).json({ success: true });
  }

  if (!fullName || !mobileNumber || !enquiryType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const lead_type = ENQUIRY_TO_LEAD_TYPE[enquiryType];
  if (!lead_type) {
    return res.status(400).json({ error: 'Invalid enquiry type' });
  }

  // Basic sanity limits — nothing here should legitimately be long. Caps
  // prevent someone from submitting megabyte-sized field values that bloat
  // storage or slow the request.
  const MAX = { fullName: 120, mobileNumber: 20, village: 120, cityDistrict: 120, state: 60, message: 2000 };
  const fields = { fullName, mobileNumber, village, cityDistrict, state, message };
  for (const [key, max] of Object.entries(MAX)) {
    if (fields[key] && String(fields[key]).length > max) {
      return res.status(400).json({ error: `${key} is too long` });
    }
  }

  // Loose but real phone-format check — allows +91, spaces, hyphens, 10–13
  // digits overall. Intentionally not stricter than this: real submissions
  // vary (landlines, +91 prefix, etc.) and the goal is filtering obvious
  // garbage, not being a strict phone validator.
  const digitsOnly = String(mobileNumber).replace(/[^\d]/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return res.status(400).json({ error: 'Please enter a valid mobile number' });
  }

  try {
    // Best-effort district match: contact.html only has a free-text
    // "City / District" field, not a real district picker, so try a
    // case-insensitive exact match against our districts table. If it
    // doesn't match anything, the lead is submitted unassigned and an
    // admin routes it manually using the free-text village/district/state
    // preserved below in extra_fields — this never blocks the submission.
    let district_id = null;
    if (cityDistrict && String(cityDistrict).trim()) {
      try {
        const districtsRes = await fetch(
          `${FBC_URL}/rest/v1/districts?select=id,name&name=ilike.${encodeURIComponent(String(cityDistrict).trim())}`,
          { headers: { apikey: FBC_ANON_KEY, Authorization: `Bearer ${FBC_ANON_KEY}` } }
        );
        const districts = await districtsRes.json();
        if (Array.isArray(districts) && districts.length === 1) district_id = districts[0].id;
      } catch (e) {
        // Non-fatal — just proceed unassigned.
      }
    }

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
        district_id,
        revenue_division_id: null,
        extra_fields: {
          village: village ? String(village).trim() : null,
          city_district: cityDistrict ? String(cityDistrict).trim() : null,
          state: state ? String(state).trim() : null,
          message: message ? String(message).trim() : null,
        },
      }),
    });

    const result = await submitRes.json();
    if (!submitRes.ok) {
      console.error('CRM submit-lead error:', result.error);
      return res.status(502).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({ success: true, lead_id: result.lead_id });
  } catch (err) {
    console.error('Submit-lead error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
