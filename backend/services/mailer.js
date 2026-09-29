const nodemailer = require('nodemailer');
require('dotenv').config();
const i18next = require('i18next'); // 👈 Import i18next to implement lang
const QRCode = require('qrcode');
const path = require('path');

// Setup Gmail transport using SSL (port 465)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // true for port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const MailerService = {
  /**
   * Send 6 digits verification code to user
   */
  async sendVerificationCode(toEmail, code, lng) {
    const mailOptions = {
      from: `"Clipper-one EATC" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${i18next.t('mail_subject', { lng })}`,
      // Version in txt if email customer does not soport HTML
      text: `${i18next.t('mail_text', { lng })}: ${code}`,
      // Version HTML
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eee; margin: auto;">
          <h2 style="color: #333; text-align: center;">${i18next.t('mail_title', { lng })}</h2>
          <p style="font-size: 16px; color: #555;">${i18next.t('mail_body', { lng })}</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff; margin: 20px 0; border-radius: 5px;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">${i18next.t('mail_footer', { lng })}</p>
        </div>
      `,
    };

    // Send email asyncronous way
    return await transporter.sendMail(mailOptions);
  },

  async sendQrCodeMail(toEmail, QrCode, candidateName, groupName, lng, toUserSystem, mailBody) {
    console.log('Preparing QR Code email');

    try {
      // 1. Generate Buffer
      const qrBuffer = await QRCode.toBuffer(QrCode, {
        width: 300,
        margin: 2
      });
      
      // 1.1 Prepare path to bring the pdf file
      const pdfPath = path.join(__dirname, 'assets', 'attachments', 'eatc_safety_breafing.pdf');

      const mailOptions = {
        from: `"Clipper-one EATC" <${process.env.SMTP_USER}>`,
        to: toEmail,
        envelope: {
          from: toUserSystem, // <--- Mail Delivery Subsystem
          to: toEmail
        },
        subject: `${i18next.t('mail_candidate_subject', { lng, groupName })} ${groupName}`,
        text: `${i18next.t('mail_candidate_text', { lng, candidateName, groupName })}`,
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eee; margin: auto; border-radius: 8px;">
          <h2 style="color: #0d6efd; text-align: center;">Clipper-one EATC - Grupa</h2>
          <p style="font-size: 16px; color: #333;">${i18next.t('mail_candidate_text', {lng})}, <strong>${candidateName}</strong>,</p>
          <p style="font-size: 15px; color: #555; line-height: 1.5;">
            ${mailBody}
          </p>
          <div style="background-color: #e7f1ff; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; color: #0d6efd; margin: 20px 0; border-radius: 5px;">
            ${groupName}
          </div>
          <p style="font-size: 16px; color: #290af3; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
            ${i18next.t('mail_candidate_footer', { lng })}
          </p>
          <p text-align: center;>
            <a href="${i18next.t('mail_candidate_url',{lng})}">${i18next.t('mail_candidate_url',{lng})}</a>
          </p>
        </div>`,
        attachments: [
        {
          filename: `QR_${QrCode}.png`,
          content: qrBuffer,
          cid: 'generated-QR-Code'
        },
        // Attach PDF
        {
          filename: 'Instrukcja Candidat Safety Breafing', // Visible name
          path: pdfPath
        }
      ]
      };
    
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      console.error('Error sending QR email:', error);
      throw error; // Throw error
    }
  },

  async sendAdminNotification(adminEmails, groupName) {
    // At least one admin
    if (!adminEmails || adminEmails.length === 0) {
      console.warn('[ADMIN MAIL] No active administrator users found.');
      return;
    }

    // Do not forget to translate such strings to other langs...
    const subject = `[Clipper-One] Powiadomienie: Nowa grupa kandydatów ${groupName}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #0d6efd;">Podsumowanie Rejestracji Kandydatów</h2>
        <p>Utworzono nową grupę kandydatów w systemie.</p>

        <p style="margin-top: 20px; font-size: 0.9em; color: #6c757d;">
          Wiadomość wygenerowana automatycznie przez system Clipper-One.
        </p>
      </div>
    `;

    // Array of emails ['admin1@email.com', 'admin2@email.com'] to string coma separate
    const recipients = adminEmails.map(a => a.s_email).join(',');

    const mailOptions = {
      from: `"Clipper-one EATC" <${process.env.SMTP_USER}>`,
      to: recipients,
      subject: subject,
      html: htmlContent
    };

    return await transporter.sendMail(mailOptions);
  },
};

module.exports = MailerService;
