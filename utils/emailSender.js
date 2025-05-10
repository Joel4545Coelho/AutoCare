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
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );
  return resetPasswordToken;
};

// Enviar e-mail de reset
exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const mailOptions = {
    to: email,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject: 'Redefinição de Senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Redefinição de Senha</h2>
        <p>Você solicitou a redefinição de senha para sua conta.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Redefinir Senha</a>
        <p>Se você não solicitou esta alteração, por favor ignore este e-mail.</p>
        <p style="font-size: 12px; color: #7f8c8d;">Este link expirará em 1 hora.</p>
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
    subject: 'Senha Alterada com Sucesso',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Senha Alterada</h2>
        <p>Sua senha foi alterada com sucesso.</p>
        <p>Se você não realizou esta alteração, entre em contato conosco imediatamente.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};