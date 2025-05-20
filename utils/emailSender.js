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
        subject: '🔐 Redefinição de Senha - AutoCare',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0055aa;">Redefinição de Senha</h2>
                <p>Olá,</p>
                <p>Recebemos uma solicitação para redefinir a senha associada a este e-mail.</p>
                <p>Para continuar, clique no botão abaixo:</p>
                <a href="${resetUrl}" style="
                    display: inline-block;
                    padding: 10px 20px;
                    margin: 20px 0;
                    background-color: #0055aa;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 5px;
                ">Redefinir Senha</a>
                <p>Este link é válido por 1 hora. Após esse período, será necessário solicitar novamente.</p>
                <p>Se você não fez esta solicitação, por favor ignore este e-mail.</p>
                <hr style="margin-top: 30px;"/>
                <p style="font-size: 14px; color: #888;">Atenciosamente,<br/>Equipe Vitalure</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

const sendPasswordChangedEmail = async (email) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '✅ Senha Alterada com Sucesso - AutoCare',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #28a745;">Senha Alterada</h2>
                <p>Olá,</p>
                <p>Informamos que sua senha foi alterada com sucesso.</p>
                <p>Se você não realizou essa alteração, entre em contato imediatamente com nossa equipe de suporte.</p>
                <hr style="margin-top: 30px;"/>
                <p style="font-size: 14px; color: #888;">Atenciosamente,<br/>Equipe Vitalure</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};


module.exports = {
    generateResetToken,
    sendPasswordResetEmail,
    sendPasswordChangedEmail
};