const db = require('./cnx-db'); // Connection to DB

const AdminReportModel = {
 
    /**
   * All candidates
   */
  async allCandidates() {
    const query = `select * from view_admin_report;`;
    const [rows] = await db.execute(query);
    return rows || null; // Feedback with a existence records, or null
  },

  /**
   * Search for active groups and not due
  */
  async findCandidatesByGroup(groupName) {
    if (!groupName) {
      return [];
    }
    const query = `select * from view_admin_report where concat( s_type, " - ", s_id_internal_group, ": ", d_date_start) = ?`;
    const [rows] = await db.execute(query, [groupName]);
    return rows || null; // Feedback with a existence records, or null
  },

   /**
   * All distinct groups
   */
  async allGroups() {
    const query = `select 'All' as 's_groups' union select distinct concat( s_type, " - ", s_id_internal_group, ": ", d_date_start) as 's_groups' from view_admin_report;`;
    const [rows] = await db.execute(query);
    return rows || null; // Feedback with a existence records, or null
  },

}
module.exports = AdminReportModel;