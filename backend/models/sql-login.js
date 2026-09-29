const db = require('./cnx-db'); // Connection to DB

const LoginModel = {
  
  /**
   * Saves new code for Login and verification
   */
  async saveAuthCode(email, code) {
    const query = `
      INSERT INTO auth_codes (s_email, s_code, d_expires_at) 
      VALUES (?, ?, NOW() + INTERVAL 15 MINUTE)
    `;
    const [result] = await db.execute(query, [email, code]);
    return result;
  },

  /**
   * Search for a valid code, not used and not due
   */
  async findValidCode(email, code) {
    const query = `
      SELECT * FROM auth_codes 
      WHERE s_email = ? 
        AND s_code = ? 
        AND b_used = 0 
        AND d_expires_at > NOW()
      ORDER BY d_created_at DESC 
      LIMIT 1
    `;
    const [rows] = await db.execute(query, [email, code]);
    return rows[0] || null; // Feedback with a existence record, or null
  },

  /**
   * Update code as used to avoid reutilization
   */
  async markCodeAsUsed(id) {
    const query = 'UPDATE auth_codes SET b_used = 1 WHERE n_id = ?';
    await db.execute(query, [id]);
  },

  /**
   * Search for a permanent user by email
   */
  async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE s_email = ? and b_active = 1';
    const [rows] = await db.execute(query, [email]);
    return rows[0] || null;
  },

  /**
   * Saves new permanent user with a UUID
   */
  async createNewUser(email) {
    const query = 'INSERT INTO users (s_id, s_email) VALUES (UUID(), ?)';
    await db.execute(query, [email]);
    
    // Retake new user to search again
    return await this.findUserByEmail(email);
  }
};

module.exports = LoginModel;