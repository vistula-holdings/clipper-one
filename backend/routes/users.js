var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();
const UserModel = require('../models/sql-users')
dotenv.config();

// Guard 1 middleware.
function requireAuth(req, res, next) {
  const userLogged = req.session.user?.s_email;
  console.log('User logged: ', userLogged);

  if (req.session && req.session.user.s_role === 'admin') {
    console.log('[AUTH] Settle session!');
    return next();
  } else {
    console.log('[AUTH] Not settle session!');
    return res.redirect(`/login/start?lng=${req.language}`);
  }
}


/* GET users listing. */
router.get('/:p_action', requireAuth, async function(req, res, next) {
  const activeUsers = await UserModel.findValidUsers();
  const systemUsers = await UserModel.findSystemUsers();
  console.log('Active users: ', activeUsers);
  try {
    let viewData = {
      n_year: process.env.N_YEAR, 
      s_version: process.env.APP_VERSION, 
      action: req.params.p_action, 
      toastMessage: '',
      toastClass: '',
      user: req.session.user,
      activeUsers: activeUsers,
      systemUsers: systemUsers
    };
    console.log(`[USERS] How many users: ${viewData.activeUsers.length} found.`);
    
    switch(req.params.p_action) {
      case 'start':
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'update':
        viewData.toastMessage = 'updateToastMessage';
        viewData.toastClass = 'toast bg-success text-white fade show';
        break;
      case 'error':
        viewData.toastMessage = 'errorToastMessage';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
      case 'warning':
        viewData.toastMessage = 'warningToastMessage';
        viewData.toastClass = 'toast bg-warning text-white fade show';
        break;
      default:
        viewData.toastMessage = 'loginToastMessage.';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
      }
  
    res.render('users', { viewData, userEmail: req.session.user?.s_email });
  } catch(error){
    // If the DB fails, catch the error and server continue running
    console.error('Error query users:', error);
    next(error);
  }

});

/* POST: Procesar la actualización del formulario de roles */
router.post('/update-role', requireAuth, async function(req, res, next) {
  const { userId, inputRole } = req.body;

  // Definimos de forma automática el enlace de entrada según el rol elegido
  let targetLink = 'no_link';
  if (inputRole === 'org-pilot') targetLink = '/org-pilot/start?lng=pl';
  if (inputRole === 'org-cabincrew') targetLink = '/org-cabincrew/start?lng=pl';

  try {
    await UserModel.updateUserRole(userId, inputRole, targetLink);
    console.log(`[USERS] Admin updated user ID ${userId} with rol: ${inputRole}`);
    
    // Redirect to user list keeping lang
    return res.redirect(`/users/update?lng=${req.language}`);
  } catch (error) {
    console.error("[USERS] Error actualizando rol:", error);
    return res.redirect(`/users/error?lng=${req.language}`);
  }
});

module.exports = router;
