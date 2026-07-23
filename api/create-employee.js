// api/create-employee.js
// HR Manager / Admin / Super Admin only. Creates the employee's login (via invite email
// or a temporary password) and their profile record — full name, phone, department,
// date of joining, reporting manager, and role — in one step.
//
// SECURITY: uses the Supabase service role key, which can create/manage any user account.
// This key must ONLY ever be read from process.env here, server-side. Never expose it to
// the browser, never log it, never put it in a client-side file.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uylkgldmyyvtxxsmkquy.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing service role key' });
  }

  const {
    requesterId,       // auth.uid() of the HR/Admin/Super Admin making this request
    fullName, email, phone,
    department, dateOfJoining, reportingManagerId,
    roleCode,           // e.g. 'hr_manager', 'accountant', 'cashier' — matches roles.code
    loginMethod,        // 'invite' | 'temp_password'
    tempPassword        // required if loginMethod === 'temp_password'
  } = req.body || {};

  if (!fullName || !email || !roleCode || !loginMethod || !requesterId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (loginMethod === 'temp_password' && (!tempPassword || tempPassword.length < 6)) {
    return res.status(400).json({ error: 'Temporary password must be at least 6 characters' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verify the requester is actually allowed to create employees (HR Manager / Admin / Super Admin)
  const { data: requester, error: requesterErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', requesterId)
    .single();

  if (requesterErr || !requester || !['hr_manager', 'admin', 'super_admin'].includes(requester.role)) {
    return res.status(403).json({ error: 'Not authorized to create employee accounts' });
  }

  try {
    let newUserId;

    if (loginMethod === 'invite') {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, phone }
      });
      if (error) throw error;
      newUserId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone }
      });
      if (error) throw error;
      newUserId = data.user.id;
    }

    // The existing handle_new_user trigger already inserted a profiles row (role='pending').
    // Update it now with the real role and employee details — HR has already decided these,
    // so this bypasses the pending-approval state entirely.
    const { data: updatedProfile, error: updateErr } = await admin
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        role: roleCode,
        department: department || null,
        date_of_joining: dateOfJoining || null,
        reporting_manager_id: reportingManagerId || null,
        created_by: requesterId
      })
      .eq('id', newUserId)
      .select('customer_id, full_name, role')
      .single();

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      employeeId: updatedProfile.customer_id,
      loginMethod
    });

  } catch (err) {
    console.error('create-employee error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create employee' });
  }
}
