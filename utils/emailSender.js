const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const jwtkey = process.env.JWT_SECRET || "zzzzzzzzzz";

const transporter = nodemailer.createTransport({
    service: 'Gmail', // Substitua por SendGrid, AWS SES, etc., se necessário
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateResetToken = (userId) => {
    return jwt.sign({ id: userId }, jwtkey, { expiresIn: '1h' });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Redefinição de Senha - AutoCare',
        html: `
            <p>Olá,</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para continuar:</p>
            <a href="${resetUrl}">Redefinir Senha</a>
            <p>Este link expira em 1 hora. Se você não solicitou esta alteração, ignore este e-mail.</p>
            <p>Equipe AutoCare</p>
        `
    };

    await transporter.sendMail(mailOptions);
};

const sendPasswordChangedEmail = async (email) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Senha Alterada com Sucesso - AutoCare',
        html: `
            <p>Olá,</p>
            <p>Sua senha foi alterada com sucesso. Se não foi você quem realizou esta alteração, entre em contato com nossa equipe imediatamente.</p>
            <p>Equipe AutoCare</p>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    generateResetToken,
    sendPasswordResetEmail,
    sendPasswordChangedEmail
};