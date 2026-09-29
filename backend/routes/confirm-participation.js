const express = require('express');
const router = express.Router();
const crypto = require('crypto');
var dotenv = require('dotenv');
const ConfirmParticipationModel = require('../models/sql-confirm-participation');
const MailerService = require('../services/mailer');
dotenv.config();

// 1. Show PDF
router.get('/:p_action', async (req, res) => {
  let viewData = {
    n_year: process.env.N_YEAR, 
    s_version: process.env.APP_VERSION, 
    action: req.params.p_action,
    isNewRecord: false,
    isQrCode: false, 
    toastMessage: '',
    toastClass: '',
    errorMessage:'',
    warningMessage:'',
    confirmParticipation: true
  };

  switch(req.params.p_action) {
    case 'start':
      viewData.toastMessage = 'startToastMessage';
      viewData.toastClass = 'toast bg-primary text-white fade show';
    break;
    case 'send-email':
      viewData.toastMessage = 'mailSuccessToastMessage';
      viewData.toastClass = 'toast bg-success text-white fade show';
    break;
    case 'resend-email':
      viewData.toastMessage = 'mailSuccessToastMessage';
      viewData.toastClass = 'toast bg-success text-white fade show';
    break;
    case 'notfound':
      viewData.toastMessage = 'errorToastMessage';
      viewData.toastClass = 'toast bg-danger text-white fade show';
    break;
    default:
      viewData.toastMessage = 'loginToastMessage.';
      viewData.toastClass = 'toast bg-warning text-white fade show';
      viewData.isNewRecord = false;
      viewData.isQrCode = false;
    break;
  }
  return res.render('confirm-participation', {viewData});

});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// 2. Confirmation
router.post('/:p_action', async (req, res) => {
  let viewData = {
    n_year: process.env.N_YEAR, 
    s_version: process.env.APP_VERSION, 
    action: req.params.p_action,
    isNewRecord: false,
    isQrCode: false, 
    toastMessage: '',
    toastClass: '',
    errorMessage:'',
    warningMessage:'',
    candidate:'',
    confirmParticipation: true
  };

  switch(req.params.p_action) {
    case 'confirm':{
      const { useremail } = req.body;
      console.log('CONFIRM-PARTICIPATION: Looking for valid email: ', useremail);
      viewData.toastMessage = 'startToastMessage';
      viewData.toastClass = 'toast bg-primary text-white fade show';
      
      // Search the eamil in training_candidates table
      const rowsTC = await ConfirmParticipationModel.findCandidateByEmail(useremail);
      if (!rowsTC || rowsTC.length === 0) {
        return res.redirect(`/confirm-participation/notfound?lng=${req.language}`)
      } else {
        
        // Search the email in registered_candidates table
        const rowsRC = await ConfirmParticipationModel.findRegisteredByEmail(useremail);
        if(!rowsRC || rowsRC.length === 0){
          console.log('CONFIRM-PARTICIPATION: registered_candidates', rowsRC);
          console.log('CONFIRM-PARTICIPATION: training_candidates', rowsTC);
          viewData.isNewRecord = true;
          viewData.candidate = rowsTC;
          return res.render('confirm-participation', {viewData} );
        } else {
          return res.redirect(`/confirm-participation/resend-email?lng=${req.language}`);
        }

      }
      break; }
    case 'register-confirmation': {
      const { useremail, nameConfirmation, groupConfirmation, rodoAccepted, safetyAccepted, codeId } = req.body;

      // Obtener la IP real que envía Nginx a través del encabezado
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      /*
      if (!rodoAccepted || !safetyAccepted) {
        return res.render('confirm-participation/confirm', { error: 'Musze zaakceptować politykę RODO i Safety Briefing.' });
      }
      */

      try {
        //const generatedQrId = crypto.randomUUID().substring(0, 8).toUpperCase();
        // await ConfirmParticipationModel.registerCandidate(generatedQrId, useremail, nameConfirmation, surnameConfirmation, clientIp);
        console.log(`[CANDIDATE PILOT/CABINCREW] New candidate created: ${nameConfirmation}`);

        // SEND EMAIL TO REGISTERED CANDIDATE
        //await MailerService.sendMailCandidate(inputEmail, inputName+' '+inputSurname);
        console.log(`\n============== [EMAIL SIMULATOR REGISTERED NOTIFICATION] ==============`);
        console.log(`To: ${useremail}`);
        // console.log(`Subject: Potwierdzenie uczestnictwa`);
        // console.log(`Candidate: ${nameConfirmation} ${surnameConfirmation} `);
        // console.log(`QR Code: ${generatedQrId}`);
        // console.log(`===============================================\n`);

        // Send email with QR code
        await MailerService.sendQrCodeMail(useremail, codeId, nameConfirmation, groupConfirmation, req.language);
        return res.redirect(`/confirm-participation/send-email?lng=${req.language}`);

      } catch (err) {
        console.error(err);
        return res.redirect(`/confirm-participation/error?lng=${req.language}`);
      }

      break; }
    
    default:
      viewData.toastMessage = 'loginToastMessage.';
      viewData.toastClass = 'toast bg-danger text-white fade show';
      viewData.isNewRecord = false;
      viewData.isQrCode = false;
      break;
  }


});

module.exports = router;