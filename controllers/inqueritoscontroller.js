const Inquerito = require("../models/Inquerito");
const User = require("../models/user");
const Doenca = require("../models/Doenca");

exports.getInqueritos = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // Verifica se o usuário está autenticado
    if (!currentUser) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Verifica se o usuário é um médico
    if (currentUser.type !== "medico") {
      return res.status(403).json({ error: "Acesso negado: Apenas médicos podem visualizar os inquéritos" });
    }

    // Busca todos os inquéritos (se precisar filtrar por pacientes específicos, podemos ajustar)
    const inqueritos = await Inquerito.find();

    if (!inqueritos || inqueritos.length === 0) {
      return res.status(404).json({ message: "Nenhum inquérito encontrado" });
    }

    console.log("Inquéritos encontrados =>", inqueritos);
    res.json(inqueritos);
  } catch (error) {
    console.error("Erro ao buscar inquéritos:", error);
    res.status(500).json({ error: "Erro ao buscar inquéritos" });
  }
};

exports.createInquerito = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // Verifica se o usuário está autenticado
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    const currentUserId = currentUser._id;
    const inquerito = new Inquerito({
      clienteId: currentUserId,
      doenca: req.body.doenca,
      sintomas: req.body.sintomas
    });

    await inquerito.save();
    res.status(201).json(inquerito);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.InqueritoG = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // Verifica se o usuário está autenticado
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    const userId = currentUser._id;

    console.log(req.query.doencaselc);

    const inqueritos = await Inquerito.find({ clienteId: userId, doenca: req.query.doencaselc });
    console.log(inqueritos);

    if (!inqueritos.length) {
      return res.status(404).json({ message: "No inqueritos found for this user" });
    }

    res.json(inqueritos);
  } catch (error) {
    console.error("Error fetching inqueritos:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDoencas = async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    const currentUser = res.locals.user;
    if (!currentUser) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Verifica se o usuário existe
    const user = await User.findById(currentUser._id).populate({ path: 'pacientes_associados', model: User });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    console.log("Consultas encontradas =>", user);

    // Retorna os dados do usuário e os usernames dos pacientes associados
    res.json(user);
  } catch (error) {
    console.error("Erro ao buscar consultas:", error);
    res.status(500).json({ error: "Erro ao buscar consultas" });
  }
};

exports.getPerguntasByDoenca = async (req, res) => {
  try {
    const doenca = req.params.doenca;

    console.log(`🔍 Buscando perguntas para a doença: ${doenca}`);

    const doencaData = await Doenca.findOne({ doenca: doenca });

    if (!doencaData) {
      return res.status(404).json({ message: `Doença não encontrada: ${doenca}` });
    }

    res.json(doencaData.perguntas);
  } catch (error) {
    console.error("❌ Erro ao buscar perguntas:", error);
    res.status(500).json({ message: "Erro ao buscar perguntas", error });
  }
};
