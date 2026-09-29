var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/:p_action', function(req, res, next) {
const currentLang = req.language || 'en';

  if (req.session && req.params.p_action == 'start') {
    // 1. Destroy server session 
    req.session.destroy((err) => {
      if (err) {
        console.error('Error to destroy session:', err);
        return res.redirect('/index/start?lng=' + currentLang);
      }
      
      // 2. Clean browser cookie (express-session or sid)
      res.clearCookie('connect.sid'); 
      
      // 3. Redirect to login in clean way
      console.log('[AUTH] Session closed succesfully.');
      return res.redirect('/login/start?lng=' + currentLang);
    });
  } else {
    // If no session, send it to login
    res.redirect('/login/start?lng=' + currentLang);
  }
});

module.exports = router;
