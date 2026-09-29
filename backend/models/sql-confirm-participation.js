const db = require('./cnx-db'); // Connection to DB

const ConfirmParticipationModel = {

    async findRegisteredByEmail(email) {
        console.log('Looking for registered candidate: ', email);
        const query = `SELECT * FROM registered_candidates WHERE s_email = ? and b_send_email = 1`;
        const [rows] = await db.execute(query, [email]);
        return rows[0] || null;
    },



    async findCandidateByEmail(email) {
        const query = `SELECT * FROM training_candidates 
            WHERE training_candidates.s_id_internal_group IN 
                (SELECT s_id_internal_group FROM training_groups WHERE b_status = 1 AND d_date_start > CURDATE())
            and s_email = ?`;
        const [rows] = await db.execute(query, [email]);
        return rows[0] || null;
    },

    async registerCandidate(generatedQrId, email, nameConfirmation, surnameConfirmation, clientIp) {
        const query = `INSERT into registered_candidates(n_id_training_student, s_email, s_name_confirmation, s_surname_confirmation, s_ip, s_qr_id) VALUES (?, ?, ?, ?, ?, ?)`;
        const [rows] = await db.execute(query, [generatedQrId, email, nameConfirmation, surnameConfirmation, clientIp, generatedQrId]);
        return rows[0] || null;
    },
}
module.exports = ConfirmParticipationModel;