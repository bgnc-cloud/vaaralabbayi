// api/reset-employee-password.js
// HR Manager / Admin / Super Admin only. Resets an existing employee's password — either
// a temporary password set directly, or a reset-link email sent to their registered address.
//
// SECURITY: uses the Supabase service role key, which can create/manage any user account.
// This key must ONLY ever be read from process.env here, server-side. Never expose it to
// the browser, never log it, never put it in a client-side file.
//
// SECURITY: the caller's identity is verified from their real Supabase session token
// (sent as an Authorization: Bearer header), never from a client-supplied ID field.
// Mirrors api/create-employee.js exactly for this reason — see its comments for why.
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://uylkgldmyyvtxxsmkquy.supabase.co';

// Public anon key — the same one already embedded client-side in shell.js. Anon keys are
// meant to be public (RLS protects the data, not this key), so hardcoding it here is safe.
// It's only used for the "invite" path below, since Supabase's admin.generateLink() does
// NOT reliably auto-send the recovery email the way the public resetPasswordForEmail() does
// — the exact same method already confirmed working elsewhere in this app (the "Forgot
// password?" flow on the sign-in page uses this same call).
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bGtnbGRteXl2dHh4c21rcXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjA2MzgsImV4cCI6MjEwMDE5NjYzOH0.UQTA1S7_foALSPHBdQbwSVRp50pGTcGAyiyyaB4EjsI';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing service role key' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verify the caller's identity from their real session token — never trust a client-supplied ID.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const requesterId = user.id; // cryptographically verified, not client-supplied

  const {
    employeeId,     // profile id of the employee whose password is being reset
    method,         // 'invite' | 'temp_password'
    tempPassword    // required if method === 'temp_password'
  } = req.body || {};

  if (!employeeId || !method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (method === 'temp_password' && (!tempPassword || tempPassword.length < 6)) {
    return res.status(400).json({ error: 'Temporary password must be at least 6 characters' });
  }

  // Verify this verified user is actually allowed to manage employee accounts.
  const { data: requester, error: requesterErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', requesterId)
    .single();
  if (requesterErr) {
    console.error('reset-employee-password: requester lookup failed', requesterErr);
    return res.status(403).json({ error: `Could not verify your account: ${requesterErr.message} (code: ${requesterErr.code || 'unknown'})` });
  }
  if (!requester || !['hr_manager', 'admin', 'super_admin'].includes(requester.role)) {
    console.error('reset-employee-password: requester role not permitted', requesterId, requester);
    return res.status(403).json({ error: `Not authorized to reset employee passwords (your role: ${requester ? requester.role : 'no profile found'})` });
  }

  // Look up the target employee.
  const { data: target, error: targetErr } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', employeeId)
    .single();
  if (targetErr || !target) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // HR Manager cannot reset a Super Admin or Admin's password — same reasoning as the
  // existing prevent_self_role_escalation protection: HR shouldn't be able to take over a
  // higher-privilege account this way. Only a Super Admin or Admin can do that.
  if (requester.role === 'hr_manager' && ['super_admin', 'admin'].includes(target.role)) {
    return res.status(403).json({ error: 'HR Managers cannot reset Super Admin or Admin passwords. Ask a Super Admin to do this instead.' });
  }

  try {
    if (method === 'temp_password') {
      const { error } = await admin.auth.admin.updateUserById(target.id, { password: tempPassword });
      if (error) throw error;
      return res.status(200).json({ success: true, method, employeeName: target.full_name || target.email });
    }

    if (method === 'invite') {
      const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error } = await publicClient.auth.resetPasswordForEmail(target.email, {
        redirectTo: 'https://vaaralabbayi.com/vipl/index.html'
      });
      if (error) throw error;
      return res.status(200).json({ success: true, method, employeeName: target.full_name || target.email });
    }

    return res.status(400).json({ error: 'Invalid method — expected "temp_password" or "invite"' });
  } catch (err) {
    console.error('reset-employee-password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
}
