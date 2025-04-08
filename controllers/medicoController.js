const Inquerito = require('../models/Inquerito');
const User = require('../models/user');

const index = async (req, res) => {
    const currentUser = res.locals.user;

    if (!currentUser || currentUser.type !== 'medico') {
        return res.status(403).json({ error: "Acesso negado. Somente médicos podem acessar esta página." });
    }

    let userType = [];

    if (currentUser) {
        try {
            userType = await User.find(
                { _id: { $in: currentUser.pacientes_associados } },
                'username _id'
            ).lean();

        } catch (err) {
            console.error("Erro ao buscar pacientes associados:", err);
        }
    }

    const clienteSelecionado = req.query.cliente || null;

    try {
        let doencasAssociadas = [];

        if (clienteSelecionado) {
            const sintomas = await Inquerito.find({ clienteId: clienteSelecionado })
                .populate('clienteId', 'username') 
                .lean();

            doencasAssociadas = sintomas.map(sintoma => ({
                doenca: sintoma.doenca,
                clienteNome: sintoma.clienteId.username,
                sintomas: sintoma.sintomas
            }));
        }
        const userTypee = currentUser.type
        res.render("medico/index", {
            lista: doencasAssociadas,
            userType: userType,
            app_title: "Sintomas",
            clienteSelecionado: clienteSelecionado,
            userTypee: userTypee
        });

    } catch (err) {
        console.error("Erro ao buscar doenças e sintomas:", err);
        res.status(500).send("Erro ao buscar dados");
    }
};

module.exports = {
    index,
};
