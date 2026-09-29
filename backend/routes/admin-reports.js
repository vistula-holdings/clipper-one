var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();
const AdminReportModel = require('../models/sql-admin-reports');
dotenv.config();

// Guard 1 middleware.
function requireAuth(req, res, next) {
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

/* GET Cabincrew page. */
router.get('/:p_action', requireAuth, async function(req, res, next) {
  console.log('Starting Admin Reports');
  try {
    let viewData = {
      n_year: process.env.N_YEAR, 
      s_version: process.env.APP_VERSION, 
      action: req.params.p_action, 
      toastMessage: '',
      toastClass: '',
      activeCandidates: [],
      activeGroups: [],
      user: req.session.user,
    };
    
    switch(req.params.p_action) {
      case 'start':{
        const activeCandidates = await AdminReportModel.allCandidates();
        const activeGroups = await AdminReportModel.allGroups();
        viewData.init = true;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        viewData.activeCandidates = activeCandidates;
        viewData.activeGroups = activeGroups;
        break;
      }
      default:
        viewData.toastMessage = 'loginToastMessage.';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
    }
  
    res.render('admin-reports', { viewData, userEmail: req.session.user?.s_email });
  } catch(error){
    console.error('Error loading Admin Reports page', error);
    next(error);
  };
});

router.post('/:p_action', requireAuth, async function(req, res, next) {
  console.log('Starting method POST');
  try {
    let viewData = {
      n_year: process.env.N_YEAR, 
      s_version: process.env.APP_VERSION, 
      action: req.params.p_action, 
      toastMessage: '',
      toastClass: '',
      activeCandidates: [],
      activeGroups: [],
      user: req.session.user,
    };
    
    switch(req.params.p_action) {
      case 'filter-group':{
        const { listGroup } = req.body;
        console.log('What is coming ? ', req.body)
        console.log('What value has listGroup ?', listGroup)
        
        if(!listGroup || listGroup === 'All'){
            activeCandidates = await AdminReportModel.allCandidates();
        } else {
            activeCandidates = await AdminReportModel.findCandidatesByGroup(listGroup);
        }
        const activeGroups = await AdminReportModel.allGroups();
        viewData.init = true;
        viewData.activeCandidates = activeCandidates;
        viewData.activeGroups = activeGroups;
        viewData.toastMessage = 'warningToastMessage';
        viewData.toastClass = 'toast bg-warning text-white fade show';
        break;
      }
      default:
        viewData.toastMessage = 'loginToastMessage.';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
    }
  
    res.render('admin-reports', { viewData, userEmail: req.session.user?.s_email });
  } catch(error){
    console.error('Error loading Admin Reports page', error);
    next(error);
  }

});

module.exports = router;


