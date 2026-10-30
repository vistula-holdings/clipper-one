var express = require('express');
var router = express.Router();
const crypto = require('crypto'); // Native Library from Node to generate secure 6 digits numbers 100000 - 999999
const db = require('../models/cnx-db');
const LoginModel = require('../models/sql-login');
const MailerService = require('../services/mailer');


/* GET users listing. */
router.get('/:p_action', function(req, res, next) {
  res.render('login',{notLoginPage: false});
});

/* POST users listing. */
// Request code
router.post('/request-code/:p_action', async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.render('login', { toastKey: 'error_email_required', toastClass: 'toast text-bg-danger', showToast: true, notLoginPage: false });
  }

  try {
    // Generate cripto number between 100000 y 999999
    const code = (crypto.randomInt(100000, 999999)).toString();

    /* Insert data using NOW() + INTERVAL 15 MINUTE -- SQL syntax with no model definitions
      const query = `INSERT INTO auth_codes (s_email, s_code, d_expires_at) 
        VALUES (?, ?, NOW() + INTERVAL 15 MINUTE)
      `;
      await db.execute(query, [email, code]);
    */

    // Zero SQL with model definitions
    await LoginModel.saveAuthCode(email, code);

    // STARTER-KIT: 
    // Nodemailer to send email.
    // For now, use the console to show code:
    MailerService.sendVerificationCode(email, code, req.language)
	    .then(() => console.log(`[EMAIL SENT ] Email sent succesfully to ${email}`))
	    .catch((err) => console.error(`[EMAIL ERROR ] Fail to send email to ${email}:`, err.message));

    console.log(`\n============== [EMAIL SIMULATOR] ==============`);
    console.log(`To: ${email}`);
    console.log(`Subject: Your Verification Code`);
    console.log(`Code: ${code}`);
    console.log(`===============================================\n`);

    // Render view passing email to identify which email to verify
    res.render('verify-code', { 
      email: email, 
      toastKey: 'startToastMessage', // Message created
      toastClass: 'toast text-bg-success', 
      showToast: true 
    });

  } catch (error) {
    console.error('Error to generate crypto code:', error);
    next(error);
  }
});

// STEP 2: Verify code typed by user
router.post('/verify/:p_action', async (req, res, next) => {
  const { email, code } = req.body;

  try {

    const matchedCodeRecord = await LoginModel.findValidCode(email, code);

    if (!matchedCodeRecord) {
      return res.render('verify-code', { 
        email: email, 
        toastKey: 'invalidCodeError', 
        toastClass: 'toast text-bg-danger', 
        showToast: true 
      });
    }

    await LoginModel.markCodeAsUsed(matchedCodeRecord.n_id); // with model definitions

    let user = await LoginModel.findUserByEmail(email); // with model definitions

    if (!user) {
      // with model definitions
      user = await LoginModel.createNewUser(email);
      console.log(`[AUTH] New user registered automaticaly: ${email}`);


      // 🌟 It is create the objet in memory with initial data as per table defaults.
      user = {
          s_email: email,
          s_role: 'no_role',
          s_link: 'no_link'
      };
    }
    // console.log('User results: ', user);
    // SESSION START
    // Create an JWT or cookie for permanent session.
    // For now, sent it to index:
    req.session.user = { s_email: user.s_email,
      s_role: user.s_role, // Keep the role from user table.
      s_link: user.s_link, // Keep the page from user table.
      s_id: user.s_id
    };
    console.log(`[AUTH] Session started for ${user.s_email}, role: ${user.s_role} and page: ${user.s_link}`);

    //  FLow control and redirections by role.
    // Evaluamos el rol del usuario:
    
    if (user.s_role === 'no_role') {
      // Case 1: New user without role, go to limbo.
      return res.render('welcome', { userEmail: req.session.user?.s_email });
      //return res.redirect('/welcome/start?lng=' + req.language);
    }
    
    if (user.s_role === 'root' || user.s_role === 'admin') {
      // Case 2: Es admin or root -> Go to index.js
      return res.redirect(`/index/start?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
    }
    
    if (user.s_role === 'org-pilot') {
      // Case 3: Pilot organizator -> Go to org-pilot.js
      return res.redirect(`/org-pilot/start?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
    }
    
    if (user.s_role === 'org-cabincrew') {
      // Case 4: Cabin crew organizator -> go to org-cabincrew.js
      return res.redirect(`/org-cabincrew/start?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
    }

    // Por si ocurre un caso no contemplado, por seguridad lo mandamos al inicio común
    // res.redirect('/login/start?lng=' + req.language);

  } catch (error) {
    console.error('Error to check code:', error);
    next(error);
  }
});

module.exports = router;
