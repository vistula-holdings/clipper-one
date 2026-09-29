var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();
dotenv.config();

// Guard 1 middleware.
function requireAuth(req, res, next) {
  console.log('User object: ', req.session.user);
  const userLogged = req.session.user?.s_email;
  console.log('User logged: ', userLogged);

  if (req.session && req.session.user) {
    console.log('[AUTH] Settle session!');
    return next();
  } else {
    console.log('[AUTH] Not settle session!');
    return res.redirect(`/login/start?lng=${req.language}`);
  }
}

/* GET home page. */
router.get('/:p_action', requireAuth, function(req, res, next) {
  
  switch(req.params.p_action) {
    case 'start':
      var toastMessage = 'startToastMessage';
      var toastClass = 'toast bg-primary text-white fade show';
      break;
    case 'update':
      var toastMessage = 'updateToastMessage';
      var toastClass = 'toast bg-success text-white fade show';
      break;
    case 'error':
      var toastMessage = 'errorToastMessage';
      var toastClass = 'toast bg-danger text-white fade show';
      break;
    case 'warning':
      var toastMessage = 'warningToastMessage';
      var toastClass = 'toast bg-warning text-white fade show';
      break;
    default:
      var toastMessage = 'loginToastMessage.';
      var toastClass = 'toast bg-danger text-white fade show';
      break;
  }
  let viewData = {
    n_year: process.env.N_YEAR, 
    s_version: process.env.APP_VERSION, 
    s_role: req.session.user?.s_role,
    s_id: req.session.user?.s_id
  };

  res.render('index', { n_year: process.env.N_YEAR, s_version: process.env.APP_VERSION, toastMessage: toastMessage, 
    toastClass: toastClass, userEmail: req.session.user?.s_email, viewData: viewData});
});

module.exports = router;
