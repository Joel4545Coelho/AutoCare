const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const { 
  generateResetToken,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} = require("../utils/emailSender");
const jwtkey = process.env.JWT_SECRET || "zzzzzzzzzz";

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
      return res.status(400).send({ message: "Usuário não encontrado" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Usuário ou senha inválidos" });
    }

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
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).send({
      message: "Login bem-sucedido",
      _id: user._id,
      username: user.username,
      email: user.email,
      type: user.type,
      doenca: user.doenca || [],
      token: token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ message: "Erro interno no servidor" });
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
      return res.status(400).send({ message: "E-mail já está em uso" });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      type,
      doenca: processedDoenca
    });

    res.status(201).send({
      message: "Usuário registrado com sucesso",
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
      type: newUser.type,
      doenca: newUser.doenca
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).send({ message: "Erro interno ao criar usuário" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({ 
        success: true,
        message: "Se o e-mail existir, um link de recuperação será enviado"
      });
    }

    const resetToken = generateResetToken(user._id);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || req.headers.origin}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({
      success: true,
      message: "E-mail de recuperação enviado com sucesso"
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicitação de recuperação de senha"
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

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
    console.error("Reset password error:", error);
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: "Token inválido ou expirado. Solicite um novo link."
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro ao redefinir senha"
    });
  }
};

const getinfo = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const currentUser = res.locals.user;
  res.json({ 
    type: currentUser.type,
    username: currentUser.username,
    email: currentUser.email
  });
};

// Outras funções de teste
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
  teste1 
};