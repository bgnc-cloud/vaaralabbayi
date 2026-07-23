export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fullName, mobileNumber, villageDistrict, enquiryType, message } = req.body || {};

  if (!fullName || !mobileNumber || !enquiryType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = 'appzKT3AOw5G75DRf';
  const TABLE_ID = 'tblyE2XEDPpFn1Esg';

  const enquiryLabels = {
    subscribe: 'Subscriber / Household subscription',
    store: 'Digital Store operator application',
    fbc: 'FBC Team — join as RM / BDM / MM',
    investor: 'Investment enquiry',
    general: 'General question'
  };

  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            'Full Name': fullName,
            'Mobile Number': mobileNumber,
            'Village & District': villageDistrict || '',
            'Enquiry Type': enquiryLabels[enquiryType] || enquiryType,
            'Message': message || '',
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
