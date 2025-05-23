const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const { 
  generateResetToken,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendEmailVerification
} = require("../utils/emailSender");
const jwtkey = process.env.JWT_SECRET || "zzzzzzzzzz";

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "A senha deve ter pelo menos 8 caracteres"
      });
    }

    const decoded = jwt.verify(token, jwtkey);
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado. Solicite um novo link."
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await sendPasswordChangedEmail(user.email);

    res.status(200).json({
      success: true,
      message: "Senha redefinida com sucesso"
    });
  } catch (error) {
    console.error("Erro em resetPassword:", error.message, error.stack);
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado. Solicite um novo link."
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao redefinir senha",
      error: error.message
    });
  }
};

const index = async (req, res) => {
  const userType = res.locals.user ? res.locals.user.type : "";
  res.render("login/index", { userType });
};

const SignIn = async (req, res) => {
  res.render("login/SignUp", {});
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Usuário não encontrado" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Por favor, verifique seu e-mail antes de fazer login" });
    }

    if (await user.comparePassword(password)) {
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email },
        jwtkey,
        { expiresIn: "1d" }
      );
      res.cookie("auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        message: "Login bem-sucedido",
        _id: user._id,
        username: user.username,
        email: user.email,
        type: user.type,
        doenca: user.doenca || [],
        token: token,
        avatar: user.avatar
      });
    } else {
      return res.status(400).json({ message: "Usuário ou senha inválidos" });
    }
  } catch (error) {
    console.error("Erro no login:", error.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};

const logout = async (req, res) => {
  res.clearCookie("auth");
  res.setHeader("Cache-Control", "no-store");
  res.redirect("/");
};

const SignInSub = async (req, res) => {
  try {
    const { username, email, password, type, doenca } = req.body;
    const processedDoenca = Array.isArray(doenca) ? doenca : [];

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "E-mail já está em uso" });
    }

    // Create user first to get _id
    const newUser = await User.create({
      username,
      email,
      password,
      type,
      doenca: processedDoenca,
      isEmailVerified: false
    });

    // Generate token with user ID
    const emailVerificationToken = generateResetToken(newUser._id);
    newUser.emailVerificationToken = emailVerificationToken;
    await newUser.save();

    const verificationUrl = `${process.env.FRONTEND_URL || req.headers.origin}/verify-email?token=${emailVerificationToken}`;
    await sendEmailVerification(email, verificationUrl);

    res.status(201).json({
      message: "Usuário registrado com sucesso. Por favor, verifique seu e-mail para ativar a conta.",
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
      type: newUser.type,
      doenca: newUser.doenca
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro interno ao criar usuário" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Received email:", email);
    
    const user = await User.findOne({ email });
    console.log("User found:", user ? user._id : "No user");
    
    if (!user) {
      return res.status(200).json({ 
        success: true,
        message: "Se o e-mail estiver registrado, você receberá um link de recuperação."
      });
    }

    const resetToken = generateResetToken(user._id);
    console.log("Generated token:", resetToken);
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();
    console.log("User saved with token:", user.resetPasswordToken);

    const resetUrl = `${process.env.FRONTEND_URL || req.headers.origin}/reset-password?token=${resetToken}`;
    console.log("Reset URL:", resetUrl);
    
    await sendPasswordResetEmail(user.email, resetUrl);
    console.log("Email sent to:", user.email);

    res.status(200).json({
      success: true,
      message: "Se o e-mail estiver registrado, você receberá um link de recuperação."
    });
  } catch (error) {
    console.error("Erro em forgotPassword:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicitação de recuperação de senha",
      error: error.message
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, jwtkey);
    const user = await User.findOne({
      _id: decoded.id,
      emailVerificationToken: token
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado."
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "E-mail verificado com sucesso. Você pode fazer login agora."
    });
  } catch (error) {
    console.error("Erro em verifyEmail:", error.message, error.stack);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado."
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro ao verificar e-mail",
      error: error.message
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "E-mail é obrigatório." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Se o e-mail estiver registrado, você receberá um novo link de verificação."
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Este e-mail já foi verificado."
      });
    }

    const emailVerificationToken = generateResetToken(user._id);
    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL || req.headers.origin}/verify-email?token=${emailVerificationToken}`;
    await sendEmailVerification(email, verificationUrl);

    res.status(200).json({
      success: true,
      message: "E-mail de verificação reenviado com sucesso."
    });
  } catch (error) {
    console.error("Erro em resendVerification:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Erro ao reenviar e-mail de verificação",
      error: error.message
    });
  }
};

const getinfo = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Não autorizado" });
    const currentUser = res.locals.user;
    
    res.json({ 
      _id: currentUser._id,
      username: currentUser.username,
      email: currentUser.email,
      type: currentUser.type,
      sublevel: currentUser.sublevel || 'free',
      subscription: currentUser.subscription || null,
      doenca: currentUser.doenca || []
    });
  } catch (error) {
    console.error("Erro ao obter informações do usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

const teste = async (req, res) => {
  try {
    if (!res.locals.user) {
      return res.status(403).json({ message: "Não Autorizado" });
    }
    const userType = res.locals.user.type;
    res.render("chat/index", { userType });
  } catch (err) {
    console.error("Erro ao buscar detalhes do chat:", err);
    res.status(500).send("Erro ao buscar detalhes do chat");
  }
};

const teste1 = async (req, res) => {
  try {
    if (!res.locals.user) {
      return res.status(403).json({ message: "Não Autorizado" });
    }
    const userType = res.locals.user.type;
    res.render("inquerito/index", { userType });
  } catch (err) {
    console.error("Erro ao buscar detalhes do chat:", err);
    res.status(500).send("Erro ao buscar detalhes do chat");
  }
};

module.exports = { 
  index, 
  login, 
  logout, 
  SignIn, 
  SignInSub, 
  forgotPassword,
  resetPassword,
  getinfo,
  teste, 
  teste1,
  verifyEmail,
  resendVerification
};