const User = require("../models/user");
var jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const jwtkey = "zzzzzzzzzz";

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

const index = async (req, res) => {
    const userType = res.locals.user ? res.locals.user.type : "";
    res.render("login/index", { userType });
};


const SignIn = async (req, res) => {
    res.render("login/SignUp", {});
};

const login = async (req, res) => {
    try {
        var email = req.body.email;
        var password = req.body.password;
        var user = await User.findOne({ email: email });
        console.log(email + "    " + password)
        if (!user) {
            return res.status(400).send({ message: "Usuário não encontrado" });
        }

        if (user && await bcrypt.compare(password, user.password)) {
            var token = jwt.sign(
                { id: user._id.toString(), email: user.email },
                jwtkey,
                { expiresIn: "1d" }
            );
            res.cookie("auth", token, {
                httpOnly: true,  // Impede acesso via JavaScript no frontend (proteção contra XSS)
                secure: false,  // HTTPS apenas em produção
                sameSite: "Lax",  // Permite cookies entre domínios diferentes
                path: "/", // Permite que esta cookie seja usada em todas as routes
                maxAge: 24 * 60 * 60 * 1000,  // 1d);
            });

            return res.status(200).send({
                message: "Login bem-sucedido",
                _id: user._id,
                username: user.username,
                email: user.email,
                type: user.type,
                doenca: user.doenca || [],
                token: token,
                avatar:avatar
            });
        } else {
            return res.status(400).send({ message: "Usuário ou senha inválidos" });
        }
    } catch (error) {
        console.log(error.message)
    }
};

const logout = async (req, res) => {
    res.clearCookie("auth");
    res.setHeader("Cache-Control", "no-store");
    res.redirect("/");
};

const SignInSub = async (req, res) => {
    try {
        var { username, email, password, type, doenca } = req.body;

        doenca = Array.isArray(doenca) ? doenca : [];

        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username: username,
            email: email,
            password: pass,
            type: type,
            doenca: doenca
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

const getinfo = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const currentUser = res.locals.user;
    const type = currentUser.type;
    console.log("type " + type)
    res.json({ type: type });
};

module.exports = { index, login, logout, SignIn, SignInSub, teste, teste1, getinfo };
