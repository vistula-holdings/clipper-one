const db = require('./cnx-db'); // Connection to DB

const UserModel = {
  
  // Search users with no role assign
async findValidUsers() {
    const query = `select * from view_new_users;`;
    const [rows] = await db.execute(query);
    return rows || null; // Feedback with a existence records, or null
},

  // Search users with role assigned
async findSystemUsers() {
    const query = `select * from view_system_users;`;
    const [rows] = await db.execute(query);
    return rows || null; // Feedback with a existence records, or null
},


  // 2. Modify rol and redirect the link
updateUserRole: async (userId, newRole, newLink) => {
    await db.query(
      "UPDATE users SET s_role = ?, s_link = ?, b_active = CASE WHEN ? = 'no_role' THEN 0 ELSE 1 END WHERE s_id = ?",
      [newRole, newLink, newRole, userId]
    );
  }

};

module.exports = UserModel;