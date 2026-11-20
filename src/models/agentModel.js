const pool = require('../config/db');

const getAgentProfileByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM ota.agent_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const createAgentApplication = async ({ userId, companyName, companyAddress, businessDocUrl }) => {
  const { rows } = await pool.query(
    `INSERT INTO ota.agent_profiles (user_id, company_name, company_address, business_doc_url, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [userId, companyName, companyAddress, businessDocUrl || null]
  );
  return rows[0];
};

const getPendingAgentApplications = async () => {
  const { rows } = await pool.query(
    `SELECT ap.*, u.full_name, u.email, u.phone
     FROM ota.agent_profiles ap
     JOIN ota.users u ON u.id = ap.user_id
     WHERE ap.status = 'pending'
     ORDER BY ap.created_at ASC`
  );
  return rows;
};

const approveAgentApplication = async (applicationId, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Idempotency guard: only approve if still pending
    const { rows } = await client.query(
      `UPDATE ota.agent_profiles
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [applicationId, adminId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const profile = rows[0];
    // 2. Grant agent role on users table
    await client.query(
      `UPDATE ota.users SET is_agent = true, updated_at = NOW() WHERE id = $1`,
      [profile.user_id]
    );
    // 3. Initialize agent wallet with 0 balance
    await client.query(
      `INSERT INTO ota.agent_wallets (user_id, balance)
       VALUES ($1, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [profile.user_id]
    );
    await client.query('COMMIT');
    return profile;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const rejectAgentApplication = async (applicationId, adminId, reason) => {
  const { rows } = await pool.query(
    `UPDATE ota.agent_profiles
     SET status = 'rejected',
         reviewed_by = $2,
         reviewed_at = NOW(),
         rejection_reason = $3
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [applicationId, adminId, reason || null]
  );
  return rows[0] || null;
};

module.exports = {
  getAgentProfileByUserId,
  createAgentApplication,
  getPendingAgentApplications,
  approveAgentApplication,
  rejectAgentApplication,
};