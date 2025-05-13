// utils/emailSender.js
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuração do transporter de e-mail
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Gerar token de reset
exports.generateResetToken = (userId) => {
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetPasswordToken = jwt.sign(
    { id: userId, token: resetToken },
    process.env.JWT_SECRET || 'zzzzzzzzzz',
    { expiresIn: '1h' }
  );
  return resetPasswordToken;
};

// Enviar e-mail de reset
exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const mailOptions = {
    to: email,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Redefinição de Senha - AutoCare',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
          <h1>AutoCare</h1>
          <h2>Redefinição de Senha</h2>
        </div>
        <div style="padding: 20px;">
          <p>Olá,</p>
          <p>Você solicitou a redefinição de senha para sua conta no AutoCare.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Redefinir Senha</a>
          </div>
          <p>Se você não solicitou esta alteração, por favor ignore este e-mail.</p>
          <p style="font-size: 12px; color: #777;">Este link expirará em 1 hora.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #777;">
          <p>© ${new Date().getFullYear()} AutoCare. Todos os direitos reservados.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Enviar e-mail de confirmação
exports.sendPasswordChangedEmail = async (email) => {
  const mailOptions = {
    to: email,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Senha Alterada - AutoCare',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: white;">
          <h1>AutoCare</h1>
          <h2>Senha Alterada com Sucesso</h2>
        </div>
        <div style="padding: 20px;">
          <p>Olá,</p>
          <p>Sua senha foi alterada com sucesso.</p>
          <p>Se você não realizou esta alteração, entre em contato conosco imediatamente.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #777;">
          <p>© ${new Date().getFullYear()} AutoCare. Todos os direitos reservados.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};