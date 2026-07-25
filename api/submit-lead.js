export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing Airtable key' });
  }

  const { fullName, mobileNumber, village, cityDistrict, state, enquiryType, message, companyWebsite } = req.body || {};

  // Honeypot: a field real users never see or fill (hidden via CSS on the form).
  // Bots that blindly fill every input trip this — silently pretend success so they
  // don't learn they were caught, but never touch Airtable with their submission.
  if (companyWebsite) {
    return res.status(200).json({ success: true });
  }

  if (!fullName || !mobileNumber || !enquiryType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const enquiryLabels = {
    subscribe: 'Subscriber / Household subscription',
    store: 'Digital Store operator application',
    fbc: 'FBC Team — join as RM / BDM / MM',
    investor: 'Investment enquiry',
    general: 'General question'
  };

  // Only accept a known enquiry type — an unrecognized value gets rejected outright rather
  // than silently stored as a raw, uncontrolled string.
  if (!enquiryLabels[enquiryType]) {
    return res.status(400).json({ error: 'Invalid enquiry type' });
  }

  // Basic sanity limits — nothing here should legitimately be long. Caps prevent someone
  // from submitting megabyte-sized field values that bloat storage or slow the request.
  const MAX = { fullName: 120, mobileNumber: 20, village: 120, cityDistrict: 120, state: 60, message: 2000 };
  const fields = { fullName, mobileNumber, village, cityDistrict, state, message };
  for (const [key, max] of Object.entries(MAX)) {
    if (fields[key] && String(fields[key]).length > max) {
      return res.status(400).json({ error: `${key} is too long` });
    }
  }

  // Loose but real phone-format check — allows +91, spaces, hyphens, 10–13 digits overall.
  // Intentionally not stricter than this: real submissions vary (landlines, +91 prefix, etc.)
  // and the goal here is filtering obvious garbage, not being a strict phone validator.
  const digitsOnly = String(mobileNumber).replace(/[^\d]/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return res.status(400).json({ error: 'Please enter a valid mobile number' });
  }

  try {
    const BASE_ID = 'appzKT3AOw5G75DRf';
    const TABLE_ID = 'tblyE2XEDPpFn1Esg';

    const airtableRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            'Full Name': String(fullName).trim(),
            'Mobile Number': String(mobileNumber).trim(),
            'Village': village ? String(village).trim() : '',
            'City / District': cityDistrict ? String(cityDistrict).trim() : '',
            'State': state ? String(state).trim() : '',
            'Enquiry Type': enquiryLabels[enquiryType],
            'Message': message ? String(message).trim() : '',
            'Submitted At': new Date().toISOString(),
            'Status': 'New'
          }
        }],
        typecast: true
      })
    });

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      console.error('Airtable error:', errText);
      return res.status(502).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Submit-lead error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
