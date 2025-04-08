const bcrypt = require('bcrypt');
const User = require('../models/user');
const doenca = require('../models/Doenca');

const getAllUsers = async (req, res) => {
    try {
        const currentUser = res.locals.user;
        if (!currentUser || currentUser.type !== "admin") {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const currentUserId = currentUser._id;
        const userType = currentUser.type;
        const users = await User.find({ _id: { $ne: currentUserId } });
        const users_P = await User.find({ type: "paciente" }, "_id username");
        const users_M = await User.find({ type: "medico" }, "_id username");
        const users_D = await doenca.find({},"doenca");

        if (req.xhr) {
            return res.json({ data: users });
        }

        res.render("admin_pages/index", { users, users_P, users_M, users_D, userType });

    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: "Falha ao buscar usuários", details: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const currentUser = res.locals.user;
        if (!currentUser || currentUser.type !== "admin") {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: "error", message: "Usuário não encontrado" });
        }

        await user.deleteOne();
        return res.json({ status: "success", message: "Usuário removido com sucesso" });

    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        return res.status(500).json({ status: "error", message: "Falha ao deletar usuário", error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const currentUser = res.locals.user;
        if (!currentUser || currentUser.type !== "admin") {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const userId = req.params.id;
        const { username, email, type, doenca, pacientes_associados, medicos_associados } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        if (username) user.username = username;
        if (email) user.email = email;
        if (type) user.type = type;
        user.doenca = doenca;
        user.pacientes_associados = pacientes_associados; 
        user.medicos_associados = medicos_associados; 

        await user.save();

        return res.json({ status: "success", message: "Usuário atualizado com sucesso" });

    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return res.status(500).json({ error: "Erro ao atualizar usuário", details: error.message });
    }
};


const addUser = async (req, res) => {
    try {
        const currentUser = res.locals.user;
        if (!currentUser || currentUser.type !== "admin") {
            return res.status(403).json({ error: "Acesso negado" });
        }

        const { name, email, password, tipo, doenca, pacientes_associados, medicos_associados} = req.body;

        if (!name || !email || !password || !tipo ) {
            return res.status(400).json({ error: "Todos os campos são obrigatórios" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username: name,
            email: email,
            password: hashedPassword,
            type: tipo,
            doenca: doenca,
            pacientes_associados:pacientes_associados,
            medicos_associados:medicos_associados
        });

        await newUser.save();

        return res.json({ status: "success", message: "Usuário adicionado com sucesso" });

    } catch (error) {
        console.error("Erro ao adicionar usuário:", error);
        return res.status(500).json({ error: "Erro ao adicionar usuário", details: error.message });
    }
};


module.exports = { getAllUsers, deleteUser, updateUser, addUser };
