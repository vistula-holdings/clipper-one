var express = require('express');
var dotenv = require('dotenv');
var router = express.Router();
const PilotModel = require('../models/sql-org-pilots');
const MailerService = require('../services/mailer');
const multer = require('multer');
const ExcelJS = require('exceljs');

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

// 2. Setup Dates
function getFormatedDatetime() {
  const now = new Date();
  
  const year = now.getFullYear();
  // padStart assure if month is 1, keeps "01"
  const month = String(now.getMonth() + 1).padStart(2, '0'); 
  const day = String(now.getDate()).padStart(2, '0');
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 3. Setup Multer to keep the file in RAM (Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5 MB
  fileFilter: (req, file, cb) => {
    // Validate extension and mime type for Excel file (.xlsx)
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Format not supported. Please upload an Excel file (.xlsx)'));
    }
  }
});


/* GET Pilot page. */
router.get('/:p_action', requireAuth, async function(req, res, next) {
  console.log('When adding a candidate, what groups goes into url: '+ req.query.group);
  const activeGroups = await PilotModel.findValidGroups();
  const activeCandidates = await PilotModel.findValidCandidates(req.query.group);

  const { status, msg, count, mailsSent, mailsFailed, group } = req.query;
  const failedArray = (req.query && req.query.failedList) ? req.query.failedList.split(',').filter(Boolean) : [];
  
  // Structure of the alert for Excel file
  const alertData = {
    show: status === 'success',
    type: failedArray.length > 0 ? 'warning' : 'success',
    dbCount: count || 0,
    mailsSent: mailsSent || 0,
    mailsFailed: mailsFailed || 0,
    failedEmails: failedArray // Sent the list to the view
  };

  try {
    let viewData = {
      n_year: process.env.N_YEAR, 
      s_version: process.env.APP_VERSION, 
      action: req.params.p_action, 
      d_today: getFormatedDatetime(), 
      init: false,
      viewCandidates: false,
      addGroup: false,
      addCandidate: false,
      addList: false,
      toastMessage: '',
      toastClass: '',
      activeGroups: activeGroups,
      activeCandidates: activeCandidates,
      user: req.session.user,
      selectedGroup:'',
      alertData:alertData
    };
    console.log(`[PILOTS] How many groups: ${viewData.activeGroups.length} found.`);
    
    switch(req.params.p_action) {
      case 'start':
        viewData.init = true;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'addGroup':
        viewData.addGroup = true;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'addCandidate':
        viewData.addCandidate = true;
        viewData.selectedGroup=req.query.group;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'addList':
        viewData.addList = true;
        viewData.selectedGroup=req.query.group;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'viewCandidates':
        viewData.viewCandidates = true;
        viewData.init = false;
        viewData.toastMessage = 'startToastMessage';
        viewData.toastClass = 'toast bg-primary text-white fade show';
        break;
      case 'update':
        viewData.init = true;
        viewData.toastMessage = 'updateToastMessage';
        viewData.toastClass = 'toast bg-success text-white fade show';
        break;
      case 'error':
        viewData.init = true;
        viewData.toastMessage = 'errorToastMessage';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
      case 'warning':
        viewData.init = true;
        viewData.toastMessage = 'warningToastMessage';
        viewData.toastClass = 'toast bg-warning text-white fade show';
        break;
      case 'listSuccess':
        viewData.addList = true;
        viewData.selectedGroup=req.query.group;
        viewData.toastMessage = 'listSuccessToastMessage';
        viewData.toastClass = 'toast bg-success text-white fade show';
        break;
      case 'listError':
        viewData.addList = true;
        viewData.selectedGroup=req.query.group;
        viewData.toastMessage = 'listErrorToastMessage';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
      case 'excelError':
        viewData.addList = true;
        viewData.selectedGroup=req.query.group;
        viewData.toastMessage = 'excelErrorToastMessage';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
      default:
        viewData.toastMessage = 'loginToastMessage.';
        viewData.toastClass = 'toast bg-danger text-white fade show';
        break;
    }
  
    res.render('org-pilot', { viewData, userEmail: req.session.user?.s_email });
  } catch(error){
    // If the DB fails, catch the error and server continue running
    console.error('Error query pilots group:', error);
    next(error);
  }
});

router.post('/:p_action', upload.single('excelFile'), requireAuth, async function(req, res, next) {
  const user = req.session.user;
  switch(req.params.p_action) {
    case 'addGroup':
      //console.log('[DEBUG POST GROUP] form:', req.body);
      try{
        const { inputInternalGroup, inputDateStart, inputEndDate, inputGroupDescription } = req.body;
        await PilotModel.createNewGroup(inputInternalGroup, inputDateStart, inputEndDate, inputGroupDescription );

        console.log(`[CABIN CREW] New group created: ${inputInternalGroup}`);

        // 3. Redirect with 'update
        return res.redirect(`/org-pilot/update?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      } catch (error) {
        console.error("Error to create the Group:", error);
        // If something fails, redirect to error status.
        return res.redirect(`/org-pilot/error?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
      }
    break;

    case 'addCandidate':
      try{
        //console.log('[DEBUG POST GROUP] form:', req.body);
        const { inputGroupId, inputName, inputSurname, inputEmail, inputBody } = req.body;
        const emailBody = inputBody || i18next.t('mail_candidate_body', { lng });
        await PilotModel.createNewCandidate( inputGroupId, inputName, inputSurname, inputEmail );
        
        console.log(`[PILOT] New candidate created: ${inputName} ${inputSurname}`);

        // SEND EMAIL TO CANDIDATE
        const rowsRC = await PilotModel.findCandidateByEmail(inputEmail, 0);
        if(rowsRC || rowsRC.length === 1){
          console.log(`\n============== [EMAIL SIMULATOR PILOT NOTIFICATION] ==============`);
          console.log('CONFIRM-PARTICIPATION: training_candidates', inputEmail);
        } else {
          console.log('CONFIRM-PARTICIPATION: Email: ', inputEmail , ' does not exist!');
        }
        const candidateFullName = `${rowsRC.s_name ?? ''} ${rowsRC.s_surname ?? ''}`.trim();
        const qrCode = rowsRC.s_id_training_student;

        // Send email with QR code
        await MailerService.sendQrCodeMail(inputEmail, qrCode, candidateFullName, inputGroupId, req.language, req.userEmail, emailBody);
        
        // Update database.
        await PilotModel.updateMailStatus(inputGroupId, inputEmail);

        // Send email to admins.
        try {
          // 1. Get active administrators users
          const admins = await PilotModel.findAdministratorByRole();

          // 2. Send email to admins
          if (admins && admins.length > 0) {
            await MailerService.sendAdminNotification(admins, inputGroupId);
            console.log('[ADMIN MAIL] EMail sent to admins users.');
          }
        } catch (adminMailError) {
          // Error sending email to admins
          console.error('[ADMIN MAIL ERROR] Error sending email to administrator users:', adminMailError);
        }

        // Redirect with Update
        return res.redirect(`/org-pilot/update?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      } catch (error) {
        console.error("Error to create the Candidate:", error);
        // If something fails, redirect to error status.
        return res.redirect(`/org-pilot/error?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
      }
    break;

    case 'removeCandidate':
      try{
        
        const { nId, inputEmail } = req.body;

       // REMOVE CANDIDATE
       await PilotModel.removeCandidate(nId, inputEmail); 
       
       
       console.log(`\n============== [EMAIL SIMULATOR PILOT REMOVAL] ==============`);
        console.log(`The candidate ${inputEmail} has been removed!`);
        console.log(`===============================================\n`);

        // 3. Redirect with 'update
        return res.redirect(`/org-pilot/warning?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      } catch (error){
        console.error("Error to remove Candidate:", error);
        // If something fails, redirect to error status.
        return res.redirect(`/org-pilot/error?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      }
    break;

    case 'resendEmail':
      try{
        // console.log('[DEBUG POST GROUP] form:', req.body);
        const { inputGroupId, inputQrCode, inputName, inputSurname, inputEmail } = req.body;
        // RE-SEND EMAIL TO CANDIDATE
        await MailerService.sendQrCodeMail(inputEmail, inputQrCode, inputName+' '+inputSurname, inputGroupId, req.language, req.userEmail);

        console.log(`\n============== [EMAIL SIMULATOR PILOT RESEND EMAIL] ==============`);
        console.log(`To: ${inputEmail}`);
        console.log(`===============================================\n`);

        // 3. Redirect with 'update
        return res.redirect(`/org-pilot/warning?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      } catch (error){
        console.error("Error to resend email to Candidate:", error);
        // If something fails, redirect to error status.
        return res.redirect(`/org-pilot/error?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);

      }
    break;

    case 'addList':
      const groupName = req.body.inputGroupId ?? req.body.s_id_internal_group;
      const emailBody = req.body.inputBody || i18next.t('mail_candidate_body', { lng });
      try {
        // Extract group name from text req.body
        const fileBuffer = req.file?.buffer;

        // Validaciones iniciales
        if (!groupName) {
          console.log('Group name is required.');
          return res.redirect(`/org-pilot/listError?lng=${req.language}&role=${user.s_role}&token=${user.s_id}&group=${groupName}`);
        }

        if (!fileBuffer) {
          console.log('Please select a valid Excel file ');
          return res.redirect(`/org-pilot/listError?lng=${req.language}&role=${user.s_role}&token=${user.s_id}&group=${groupName}`);
        }

        // 3. Read Excel file using ExcelJS from stack memory
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);

        // Tomar la primera hoja de trabajo del libro
        const worksheet = workbook.worksheets[0];
        const parsedCandidates = [];

        // Scan rows (assuming row 1 contains header)
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip headers: [Name, Surname, Email]

          // Assuming Columns: A = Name, B = Surname, C = Email
          const name = row.getCell(1).text?.trim();
          const surname = row.getCell(2).text?.trim();
          const email = row.getCell(3).text?.trim();

          // Keep only if email is okej and "valid"
          if (email) {
            parsedCandidates.push({
              name: name || '',
              surname: surname || '',
              email: email.toLowerCase()
            });
          }
        });

        if (parsedCandidates.length === 0) {
          console,log('ADD LIST: Excel file has not valid rows or columns.');
          return res.redirect(`/org-pilot/excelError?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);  //{errorMessage: 'Excel file has not valid rows or columns.'});
        }

        // 4. Massive insert
        const result = await PilotModel.bulkInsertCandidates(groupName, parsedCandidates);

        console.log(`[BULK IMPORT] Massive insert of ${result.processedCount} candidates for group "${groupName}".`);

        // 5. Sending emails with pause of 2s and capture of individuals errors.
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        let sentCount = 0;
        const failedEmails = []; // Emails with error

        for (let i = 0; i < parsedCandidates.length; i++) {
          const candidate = parsedCandidates[i];
          const candidateEmail = candidate.email;

          try {
            // Set the process to send emails.
            // Search for email candidate from the loop y extract QR code
            const rowsRC = await PilotModel.findCandidateByEmail(candidateEmail, 0);
            if(rowsRC || rowsRC.length === 1){
              console.log('CONFIRM-PARTICIPATION: training_candidates', candidateEmail);
            } else {
              console.log('CONFIRM-PARTICIPATION: Email: ', candidateEmail , ' does not exist!');
            }
            const candidateFullName = `${rowsRC.s_name ?? ''} ${rowsRC.s_surname ?? ''}`.trim();
            const qrCode = rowsRC.s_id_training_student;

            // Send email with QR code
            await MailerService.sendQrCodeMail(candidateEmail, qrCode, candidateFullName, groupName, req.language, req.userEmail, emailBody);
            
            // Update database.
            await PilotModel.updateMailStatus(groupName, candidateEmail);
            sentCount++;

          } catch (mailError) {
            console.error(`[EMAIL ERROR] Sending email fail to ${candidateEmail}:`, mailError);
            failedEmails.push(candidateEmail); // Record specific email with error
          }

          // C. Pause of 2.5 secs between sendings to avoid SPAM.
          if (i < parsedCandidates.length - 1) {
            await sleep(2500);
          }
        }

        // 6. Redirect including list of failed emails (split by coma)
        const failedParam = failedEmails.length > 0 
          ? `&failedList=${encodeURIComponent(failedEmails.join(','))}` 
          : '';

        try {
          // 1. Get active administrators users
          const admins = await PilotModel.findAdministratorByRole();

          // 2. Send email to admins
          if (admins && admins.length > 0) {
            await MailerService.sendAdminNotification(admins, groupName);
            console.log('[ADMIN MAIL] EMail sent to admins users.');
          }
        } catch (adminMailError) {
          // Error sending email to admins
          console.error('[ADMIN MAIL ERROR] Error sending email to administrator users:', adminMailError);
        }

        
        return res.redirect(
          `/org-pilot/listSuccess?lng=${req.language}&role=${user.s_role}&token=${user.s_id}` +
          `&status=success&count=${result.processedCount}&mailsSent=${sentCount}&mailsFailed=${failedEmails.length}${failedParam}&group=${encodeURIComponent(groupName)}`
        );

      } catch (error) {
        console.error('Error to import Excel file:', error);
        return res.redirect(`/org-pilot/excelError?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
      }

    break;

    default:
      return res.redirect(`/org-pilot/start?lng=${req.language}&role=${user.s_role}&token=${user.s_id}`);
    break;
  }
});

module.exports = router;
