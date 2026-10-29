const db = require('./cnx-db'); // Connection to DB

const CabinCrewModel = {
  
  /**
   * Search for active groups and not due
   */
  async findValidGroups() {
    //const query = `SELECT n_id, s_id_internal_group, DATE_FORMAT(d_date_start, '%Y-%m-%d %H:%i') AS d_date_start,
    //DATE_FORMAT(d_date_end, '%Y-%m-%d %H:%i') AS d_date_end, s_group_description 
    // FROM training_groups WHERE b_status = 1 AND s_type = 'Cabincrew' AND d_date_start > CURDATE();`;

    const query = `select * from view_training_groups_cc;`;
    const [rows] = await db.execute(query);
    return rows || null; // Feedback with a existence records, or null
  },

  /**
   * Saves new group
   */
  async createNewGroup(internal_group, date_start, date_end, description) {
    const query = 'INSERT INTO training_groups (s_id_internal_group, s_type, d_date_start, d_date_end, s_group_description) VALUES (trim(?), ?, ?, ?, ?)';
    await db.execute(query, [internal_group, 'Cabin Crew', date_start, date_end, description]);
  },


  /**
   * Search for active groups and not due
  */
  async findValidCandidates(groupName) {
    if (!groupName) {
      return [];
    }
    const query = `SELECT * FROM view_training_candidates_cc where s_id_internal_group = ?`;
    const [rows] = await db.execute(query, [groupName]);
    return rows || null; // Feedback with a existence records, or null
  },

  // Search existing emails to avoid duplicates
  checkEmailExistsInGroup: async (email, groupName) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM training_candidates WHERE s_email = ? AND s_id_internal_group = ?`,
      [email, groupName]
    );
    return rows[0].count > 0; // Return true if email exists, false if zero.
  },

  /**
   * Saves new candidate
   */
  async createNewCandidate(internal_group, candidate_name, candidate_surname, candidate_email ) {
    const query = 'INSERT INTO training_candidates (s_id_internal_group, s_name, s_surname, s_email, s_id_training_student) VALUES (trim(?), ?, ?, ?, UPPER(LEFT(UUID(), 8)))';
    const rows = await db.execute(query, [internal_group, candidate_name, candidate_surname, candidate_email]);
    return rows || null; // Feedback with a existence records, or null
  },

  async removeCandidate(nId, email){
    const query = 'update training_candidates set b_status = 0 where n_id = ? and s_email = ?';
    const rows = await db.execute(query, [nId, email]);
    return rows || null; // Feedback update
  },

  async removeGroup(nId){
    const query = 'update training_groups set b_status = 0 where n_id = ?';
    const rows = await db.execute(query, [nId]);
    return rows || null; // Feedback update
  },

  async updateMailStatus(groupName, email){
    const query = 'update training_candidates set b_send_email = 1 where s_id_internal_group = ? and s_email = ?';
    const rows = await db.execute(query, [groupName, email]);
    return rows || null; // Feedback update
  },

  /*
    * Bulk insert/update candidates into training_candidates table
    * @param {string} groupName The internal group ID / name from the form input
    * @param {Array<Object>} candidatesList Array of objects: [{ name, surname, email }]
    * @returns {Promise<Object>} Summary of affected rows
 */
  async bulkInsertCandidates(groupName, candidatesList) {
    if (!groupName) {
      throw new Error('Group name is required for bulk insertion.');
    }

    if (!Array.isArray(candidatesList) || candidatesList.length === 0) {
      return { affectedRows: 0, processedCount: 0 };
    }
    try {
      // 1. Plain all values into an array unidimensional
      const queryValues = candidatesList.flatMap(c => [
        groupName,
        c.name ?? null,
        c.surname ?? null,
        c.email ?? null
      ]);

      // 2. Generate placeholders: (?, ?, ?, ?), (?, ?, ?, ?)
      const placeholders = candidatesList.map(() => '(trim(?), ?, ?, ?, 1, UPPER(LEFT(UUID(), 8)))').join(', ');

      // 3. SQL query is clean
      const sql = `
        INSERT INTO training_candidates 
          (s_id_internal_group, s_name, s_surname, s_email, b_status, s_id_training_student) 
        VALUES 
          ${placeholders}
        ON DUPLICATE KEY UPDATE
          s_name = VALUES(s_name),
          s_surname = VALUES(s_surname);
      `;

      // 4. Execute sql
      const [result] = await db.execute(sql, queryValues);

      return {
        processedCount: result.affectedRows || candidatesList.length
      };

    } catch (error) {
      console.error('Error en bulkInsertCandidates SQL:', error);
      throw error;
    }
  },

  async findCandidateByEmail(email, emailStatus) {
    const query = `SELECT * FROM view_training_candidates_cc 
        WHERE s_email = ? and b_send_email = ?`;
    const [rows] = await db.execute(query, [email, emailStatus]);
    return rows[0] || null;
  },

  async findAdministratorByRole() {
    const query = `select s_email from users where s_role = 'admin' and b_active = 1`;
    const [rows] = await db.execute(query);
    return rows || null;
  },

};

module.exports = CabinCrewModel;